import pandas as pd
import os
from collections import defaultdict
import numpy as np

def filter_files():
    print("=== DEBUG ===")
    print("Working directory:", os.getcwd())
    print("Files in ./:", os.listdir("."))
    print("==============")
    
    files = os.listdir(".")
    FILE_ENDINGS = ["csv", "xlsx", "xlsm", "xlsb", "xltx", "xltm", "xls", "xlt", "xlw"]

    filtered_files = {
        "csv": [],
        "xlsx": []
    }

    for file in files:
        file_parsed = file.split(".")
        if len(file) > 1:
            extension = file_parsed[-1].lower()
            if extension in FILE_ENDINGS:
                if extension == "csv":
                    filtered_files["csv"].append(file)
                else:    
                    filtered_files["xlsx"].append(file)
    
    return read_files(filtered_files)

def read_files(files):
    results = []

    for key, values in files.items():
        for val in values:
            try:
                if key == "csv":
                    df = pd.read_csv(val)
                    df["Datum"] = pd.to_datetime(df["Datum"], dayfirst=False, errors="coerce").dt.date
                    df.set_index("Datum", inplace=True)
                elif key == "xlsx":
                    df = pd.read_excel(val, engine="openpyxl")
                    df["Datum"] = pd.to_datetime(df["Datum"], dayfirst=False, errors="coerce").dt.date
                    df.set_index("Datum", inplace=True)
                print(f"\nDEBUG: Prebran DataFrame ({val}):\n", df.head())
                result = process_file(df)
                results.append(result)
            except Exception as e:
                print(f"Napaka pri {val}: {e}")

    if len(results) == 1:
        return results[0]
    return results

def process_file(file: pd.DataFrame):
    df_copy = file.copy()
    first_index_year = str(file.index[0]).split("-")[0]

    delta_values, tariff_values = calulate_delta(df_copy)

    json_obj = {}
    for index, row in file.iterrows():
        index_split = str(index).split("-")
        year, month, day = index_split
        month_key = f"{year}-{month}"

        if month_key.split("-")[0] != first_index_year:
            continue
       
        if month_key not in json_obj:
            json_obj[month_key] = {}

        day_data = {}
        for column_name in file.columns:
            value = row[column_name]
            if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
                value = None
            day_data[column_name.lower()] = value

        for col_name, series in delta_values.items():
            if not hasattr(series, "get"):
                continue
            delta = series.get(index)
            if delta is not None and not pd.isna(delta) and not np.isinf(delta):
                key = col_name.lower()
                day_data[key] = round(delta, 3)
            elif delta is not None:
                key = col_name.lower()
                day_data[key] = None

        for tariff_name, price in tariff_values.items():
            day_data[tariff_name.lower()] = price

        json_obj[month_key][str(index)] = day_data

    if has_invalid_floats(json_obj):
        print("WARNING: Najdene so še vedno NaN/inf vrednosti v json_obj!!")

    return replace_invalid_floats(json_obj)

def calulate_delta(df: pd.DataFrame):
    tariffs = {
        "vt": 0.11990,
        "mt": 0.09790,
        "et": 0.10890
    }
    delta_values = {}
    tariff_values = {}
    columns = df.select_dtypes(include=[np.number]).columns

    for col in columns:
        delta_values[f"delta {col}"] = df[col].diff().shift(-1)

    # MojElektro groups received ET/VT/MT before exported ET/VT/MT;
    # the synthetic CSV can interleave them. Match the energy and tariff
    # explicitly so column order never changes the meaning of consumption.
    columns_by_name = {" ".join(str(col).split()).casefold(): col for col in columns}
    for tariff, price in tariffs.items():
        received_column = columns_by_name.get(f"prejeta delovna energija {tariff}")
        exported_column = columns_by_name.get(f"oddana delovna energija {tariff}")
        if received_column is None or exported_column is None:
            continue

        consumption = (
            delta_values[f"delta {received_column}"]
            - delta_values[f"delta {exported_column}"]
        )
        delta_values[f"poraba {tariff}"] = consumption
        delta_values[f"cena energije {tariff}"] = consumption * price
        tariff_values[f"tarifa za {tariff}"] = price

    return delta_values, tariff_values

def has_invalid_floats(obj):
    if isinstance(obj, dict):
        return any(has_invalid_floats(v) for v in obj.values())
    elif isinstance(obj, list):
        return any(has_invalid_floats(x) for x in obj)
    elif isinstance(obj, (float, np.floating)):
        return np.isnan(obj) or np.isinf(obj)
    return False

def replace_invalid_floats(obj):
    if isinstance(obj, np.generic):
        return replace_invalid_floats(obj.item())
    elif isinstance(obj, dict):
        return {k: replace_invalid_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_invalid_floats(x) for x in obj]
    elif isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    else:
        return obj
