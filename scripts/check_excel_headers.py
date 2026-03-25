import pandas as pd
import os

try:
    file_path = r'c:\Users\ligomes\Downloads\esporte-credenciamento\CREDENCIAMENTO ORIGINAL II.xlsx'
    df = pd.read_excel(file_path, header=None)
    for i, row in df.head(10).iterrows():
        print(f"Row {i}: {row.tolist()}")
except Exception as e:
    print(f"Error: {e}")
