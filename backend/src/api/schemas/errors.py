"""Schema de erro padronizado para todos os endpoints da API.

Segue o espírito do RFC 7807 (Problem Details for HTTP APIs) com adaptações
para incluir request_id para rastreabilidade em logs distribuídos.
"""

from __future__ import annotations

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    """Detalhe de um erro de validação referente a um campo específico."""

    campo: str
    mensagem: str


class ErrorResponse(BaseModel):
    """Envelope de erro padrão retornado em todas as respostas 4xx e 5xx.

    Attributes:
        status_code: Código HTTP da resposta (ex.: 404, 422, 500).
        tipo: Slug identificador do tipo de erro (ex.: "not_found", "validation_error").
        mensagem: Descrição legível do erro para exibição ao usuário final.
        detalhes: Lista de erros por campo — preenchida apenas em erros de validação (422).
        request_id: UUID da requisição para correlação em logs e rastreamento.
    """

    status_code: int
    tipo: str
    mensagem: str
    detalhes: list[ErrorDetail] = []
    request_id: str | None = None
