PYTHON ?= python3
VENV ?= .venv
PIP := $(VENV)/bin/pip
PY := $(VENV)/bin/python

.PHONY: help setup install build-graph run clean

help:
	@echo "Available targets:"
	@echo "  make setup       Create virtualenv and install dependencies"
	@echo "  make install     Install dependencies in existing virtualenv"
	@echo "  make build-graph Generate static/graph.json from CSV data"
	@echo "  make run         Run Flask app locally"
	@echo "  make clean       Remove Python cache files"

setup:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt

install:
	$(PIP) install -r requirements.txt

build-graph:
	$(PY) create_graph.py

run:
	$(PY) app.py

clean:
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
