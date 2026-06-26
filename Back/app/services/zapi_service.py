from __future__ import annotations

import base64
from io import BytesIO
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

import requests
from flask import current_app

from app.services.formatar_numero import formatar_numero_br


class ZapiService:
    def __init__(self) -> None:
        self.base_url = (current_app.config.get("ZAPI_BASE_URL") or "").strip().rstrip("/")
        self.instance_id = (current_app.config.get("ZAPI_INSTANCE_ID") or "").strip()
        self.token = (current_app.config.get("ZAPI_TOKEN") or "").strip()
        self.client_token = (current_app.config.get("ZAPI_CLIENT_TOKEN") or "").strip()

    def _validate_config(self) -> None:
        if not self.base_url or not self.instance_id or not self.token:
            raise ValueError("Configuração da Z-API ausente: defina ZAPI_BASE_URL, ZAPI_INSTANCE_ID e ZAPI_TOKEN")

    def _endpoint(self, route: str) -> str:
        self._validate_config()
        return f"{self.base_url}/instances/{self.instance_id}/token/{self.token}/{route}"

    @staticmethod
    def _extract_error_message(payload) -> str | None:
        if not isinstance(payload, dict):
            return None

        raw_error_text = str(payload.get("error") or "").strip().lower()
        if "client-token" in raw_error_text and "not configured" in raw_error_text:
            return (
                "A instância da Z-API exige Client-Token, mas ele não está configurado na conta. "
                "No painel Z-API, acesse Segurança > Token de Segurança da Conta e configure/ative o token."
            )

        # Some providers return HTTP 200 with logical errors in the payload.
        if payload.get("error"):
            error_value = payload.get("error")
            if isinstance(error_value, str):
                return error_value
            message = payload.get("message") or payload.get("details")
            return str(message or "Falha no envio pela Z-API")

        success_value = payload.get("success")
        if success_value is False:
            return str(payload.get("message") or "Falha no envio pela Z-API")

        status_value = str(payload.get("status") or "").strip().lower()
        if status_value in {"error", "failed", "failure"}:
            return str(payload.get("message") or payload.get("details") or "Falha no envio pela Z-API")

        return None

    def _request(self, route: str, *, json: dict | None = None, data: dict | None = None, files=None):
        headers = {}
        if self.client_token:
            headers["Client-Token"] = self.client_token

        response = requests.post(
            self._endpoint(route),
            json=json,
            data=data,
            files=files,
            headers=headers or None,
            timeout=60,
        )
        response.raise_for_status()
        if not response.content:
            return {}
        payload = response.json()
        error_message = self._extract_error_message(payload)
        if error_message:
            raise ValueError(error_message)
        return payload

    def send_text_message(self, phone: str, message: str):
        normalized_phone = formatar_numero_br(phone or "")
        if not normalized_phone:
            raise ValueError("Telefone inválido para envio")

        payload = {
            "phone": normalized_phone,
            "message": message
        }

        return self._request("send-text", json=payload)

    def send_document_message(self, phone: str, file_path: str, file_name: str | None = None, caption: str | None = None):
        normalized_phone = formatar_numero_br(phone or "")
        if not normalized_phone:
            raise ValueError("Telefone inválido para envio")

        if not file_path:
            raise ValueError("Arquivo do comprovante não encontrado")

        # Use provided file_name or extract from path
        if file_name:
            document_name = file_name
        else:
            document_name = Path(file_path).name or "comprovante"
        
        extension = Path(document_name).suffix.lower().lstrip(".") or "bin"
        mime_type = mimetypes.guess_type(document_name)[0] or "application/octet-stream"

        try:
            if file_path.startswith(("http://", "https://")):
                # URL-based file (S3 presigned URL or remote file)
                payload = {
                    "phone": normalized_phone,
                    "document": file_path,
                    "fileName": document_name,
                }
                if caption:
                    payload["caption"] = caption

                current_app.logger.info(f"Enviando comprovante via URL para {normalized_phone}: {document_name}")
                return self._request(f"send-document/{extension}", json=payload)
            else:
                # Local file path
                path = Path(file_path)
                if not path.exists():
                    raise ValueError("Arquivo do comprovante não encontrado")
                content_bytes = path.read_bytes()

                encoded = base64.b64encode(content_bytes).decode("utf-8")
                payload = {
                    "phone": normalized_phone,
                    "document": f"data:{mime_type};base64,{encoded}",
                    "fileName": document_name,
                }
                if caption:
                    payload["caption"] = caption

                current_app.logger.info(f"Enviando comprovante local para {normalized_phone}: {document_name}")
                return self._request(f"send-document/{extension}", json=payload)
        except requests.HTTPError as exc:
            response_text = exc.response.text if exc.response is not None else ""
            if response_text:
                raise ValueError(f"Falha no envio pela Z-API: {response_text}")
            raise
