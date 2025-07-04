#!/bin/bash

# BioDiversity API Test Runner
# This script runs the complete test suite with coverage reporting

set -e  # Exit on any error

echo "🧪 Starting BioDiversity API Test Suite"
echo "========================================"

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "⚠️  Warning: No virtual environment detected"
    echo "   Consider activating your virtual environment first"
    echo ""
fi

# Install test dependencies if not already installed
echo "📦 Installing test dependencies..."
pip install -r requirements-test.txt > /dev/null 2>&1

# Run different test categories
echo ""
echo "🔍 Running Unit Tests..."
python -m pytest tests/test_api.py::TestSpeciesSearch -v --tb=short

echo ""
echo "🔍 Running Data Transformation Tests..."
python -m pytest tests/test_api.py::TestDataTransformation -v --tb=short

echo ""
echo "🔍 Running Error Handling Tests..."
python -m pytest tests/test_api.py::TestErrorHandling -v --tb=short

echo ""
echo "🔍 Running Async Integration Tests..."
python -m pytest tests/test_api.py::TestAsyncIntegration -v --tb=short

echo ""
echo "📊 Running Full Test Suite with Coverage..."
python -m pytest tests/ -v --cov=main --cov-report=term-missing --cov-report=html

echo ""
echo "🚀 Running Performance Tests..."
python -m pytest tests/test_performance.py -v --tb=short

echo ""
echo "✅ All tests completed!"
echo ""
echo "📈 Coverage report generated in htmlcov/index.html"
echo "🎯 Performance results available above"

# Check if coverage is acceptable
coverage_percentage=$(python -m coverage report --format=total 2>/dev/null || echo "0")
if (( $(echo "$coverage_percentage >= 80" | bc -l) )); then
    echo "✅ Coverage: ${coverage_percentage}% (Good)"
else
    echo "⚠️  Coverage: ${coverage_percentage}% (Consider improving)"
fi

echo ""
echo "🏁 Test suite execution completed successfully!"
