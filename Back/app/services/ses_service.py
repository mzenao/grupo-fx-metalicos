from __future__ import annotations

import mimetypes
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import boto3
from flask import current_app


class SesService:
	def __init__(self) -> None:
		self.client = boto3.client(
			"ses",
			aws_access_key_id=current_app.config.get("AWS_ACCESS_KEY_ID"),
			aws_secret_access_key=current_app.config.get("AWS_SECRET_ACCESS_KEY"),
			region_name=current_app.config.get("AWS_REGION"),
		)
		self.from_email = current_app.config.get("SES_FROM_EMAIL", "")

	def send_email(
		self,
		to_email: str,
		subject: str,
		body_text: str,
		body_html: str | None = None,
	) -> dict:
		if not self.from_email:
			raise ValueError("SES_FROM_EMAIL is not configured")

		body: dict = {"Text": {"Data": body_text, "Charset": "UTF-8"}}
		if body_html:
			body["Html"] = {"Data": body_html, "Charset": "UTF-8"}

		return self.client.send_email(
			Source=self.from_email,
			Destination={"ToAddresses": [to_email]},
			Message={
				"Subject": {"Data": subject, "Charset": "UTF-8"},
				"Body": body,
			},
		)

	def send_email_with_attachments(
		self,
		to_email: str,
		subject: str,
		body_text: str,
		attachments: list[dict],
		body_html: str | None = None,
	) -> dict:
		if not self.from_email:
			raise ValueError("SES_FROM_EMAIL is not configured")

		message = MIMEMultipart("mixed")
		message["Subject"] = subject
		message["From"] = self.from_email
		message["To"] = to_email

		alternative = MIMEMultipart("alternative")
		alternative.attach(MIMEText(body_text, "plain", "utf-8"))
		if body_html:
			alternative.attach(MIMEText(body_html, "html", "utf-8"))
		message.attach(alternative)

		for attachment in attachments:
			file_name = attachment.get("file_name") or "anexo"
			file_path = attachment.get("file_path") or ""
			mime_type = attachment.get("mime_type") or mimetypes.guess_type(file_name)[0] or "application/octet-stream"
			if ";" in mime_type:
				mime_type = mime_type.split(";", 1)[0]

			if file_path.startswith(("http://", "https://")):
				import requests

				response = requests.get(file_path, timeout=60)
				response.raise_for_status()
				content_bytes = response.content
			else:
				with open(file_path, "rb") as file_handle:
					content_bytes = file_handle.read()

			maintype, subtype = mime_type.split("/", 1) if "/" in mime_type else ("application", "octet-stream")
			mime_part = MIMEApplication(content_bytes, _subtype=subtype)
			mime_part.add_header("Content-Disposition", "attachment", filename=file_name)
			message.attach(mime_part)

		return self.client.send_raw_email(
			Source=self.from_email,
			Destinations=[to_email],
			RawMessage={"Data": message.as_string()},
		)

	def send_purchase_receipt(self, to_email: str, purchase_data: dict) -> dict:
		subject = f"Purchase receipt #{purchase_data.get('id', '')}"
		body = (
			"Purchase receipt generated.\n"
			f"Supplier ID: {purchase_data.get('supplier_id')}\n"
			f"Value: {purchase_data.get('value')}\n"
			f"Date: {purchase_data.get('purchase_datetime')}\n"
		)
		return self.send_email(to_email=to_email, subject=subject, body_text=body)

