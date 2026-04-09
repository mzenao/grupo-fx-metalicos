from __future__ import annotations

import base64
import mimetypes

import requests
from flask import current_app


class ResendService:
	def __init__(self) -> None:
		self.api_key = current_app.config.get("RESEND_API_KEY", "")
		self.from_email = current_app.config.get("RESEND_FROM_EMAIL", "")
		self.base_url = "https://api.resend.com/emails"

	def send_email(
		self,
		to_email: str,
		subject: str,
		body_text: str,
		body_html: str | None = None,
	) -> dict:
		if not self.api_key:
			raise ValueError("RESEND_API_KEY is not configured")
		if not self.from_email:
			raise ValueError("RESEND_FROM_EMAIL is not configured")

		payload: dict = {
			"from": self.from_email,
			"to": [to_email],
			"subject": subject,
			"text": body_text,
		}
		if body_html:
			payload["html"] = body_html

		response = requests.post(
			self.base_url,
			headers={
				"Authorization": f"Bearer {self.api_key}",
				"Content-Type": "application/json",
			},
			json=payload,
			timeout=60,
		)
		if response.status_code >= 400:
			raise ValueError(f"Resend error ({response.status_code}): {response.text}")

		return response.json()

	def send_email_with_attachments(
		self,
		to_email: str,
		subject: str,
		body_text: str,
		attachments: list[dict],
		body_html: str | None = None,
	) -> dict:
		if not self.api_key:
			raise ValueError("RESEND_API_KEY is not configured")
		if not self.from_email:
			raise ValueError("RESEND_FROM_EMAIL is not configured")

		encoded_attachments = []

		for attachment in attachments:
			file_name = attachment.get("file_name") or "anexo"
			file_path = attachment.get("file_path") or ""
			mime_type = attachment.get("mime_type") or mimetypes.guess_type(file_name)[0] or "application/octet-stream"
			if ";" in mime_type:
				mime_type = mime_type.split(";", 1)[0]

			if file_path.startswith(("http://", "https://")):
				response = requests.get(file_path, timeout=60)
				response.raise_for_status()
				content_bytes = response.content
			else:
				with open(file_path, "rb") as file_handle:
					content_bytes = file_handle.read()

			encoded_attachments.append(
				{
					"filename": file_name,
					"content": base64.b64encode(content_bytes).decode("utf-8"),
					"type": mime_type,
				}
			)

		payload: dict = {
			"from": self.from_email,
			"to": [to_email],
			"subject": subject,
			"text": body_text,
			"attachments": encoded_attachments,
		}
		if body_html:
			payload["html"] = body_html

		response = requests.post(
			self.base_url,
			headers={
				"Authorization": f"Bearer {self.api_key}",
				"Content-Type": "application/json",
			},
			json=payload,
			timeout=120,
		)
		if response.status_code >= 400:
			raise ValueError(f"Resend error ({response.status_code}): {response.text}")

		return response.json()

	def send_purchase_receipt(self, to_email: str, purchase_data: dict) -> dict:
		subject = f"Purchase receipt #{purchase_data.get('id', '')}"
		body = (
			"Purchase receipt generated.\n"
			f"Supplier ID: {purchase_data.get('supplier_id')}\n"
			f"Value: {purchase_data.get('value')}\n"
			f"Date: {purchase_data.get('purchase_datetime')}\n"
		)
		return self.send_email(to_email=to_email, subject=subject, body_text=body)
