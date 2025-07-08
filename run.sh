#!/bin/bash
echo "Running scraper on $@..."

python info_selector.py --url "$@" 

python evaluator.py

