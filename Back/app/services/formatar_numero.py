import re

def formatar_numero_br(numero: str) -> str:
    # remove tudo que não é número
    numero = re.sub(r"\D", "", numero)

    # adiciona 55 se não tiver
    if not numero.startswith("55"):
        numero = "55" + numero

    return numero