#!/bin/bash

# BioDiversity API Test Runner
echo "🧪 Running BioDiversity API Tests..."

# Install test dependencies
pip install -r requirements.txt

# Run unit tests with coverage
echo "📊 Running unit tests with coverage..."
pytest tests/ -v --cov=main --cov-report=html --cov-report=term-missing

# Run performance tests
echo "⚡ Running performance tests..."
pytest tests/test_performance.py -v

# Run API integration tests
echo "🔗 Running integration tests..."
python -m pytest tests/test_api.py::TestSpeciesSearch -v
python -m pytest tests/test_api.py::TestObservations -v
python -m pytest tests/test_api.py::TestStats -v

# Generate test report
echo "📋 Generating test report..."
echo "Test Results Summary:" > test_report.txt
echo "===================" >> test_report.txt
pytest --tb=no --quiet >> test_report.txt

echo "✅ Tests completed! Check test_report.txt and htmlcov/ for detailed results."
