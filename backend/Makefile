.PHONY: install run etl test test-unit lint format

install:
	pip install -e ".[dev]"

run:
	uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload

etl:
	python -m src.etl.pipeline

test:
	pytest tests/ -v --cov=src --cov-report=term-missing --cov-fail-under=75

test-unit:
	pytest tests/unit/ -v

lint:
	ruff check src/ tests/

format:
	ruff format src/ tests/
	ruff check --fix src/ tests/
