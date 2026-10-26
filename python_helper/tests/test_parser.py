"""Regression checks use synthetic meter states, never personal export data."""

import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

from parser import process_file, read_files


class DailyMeterParserTests(unittest.TestCase):
    def states(self):
        return pd.DataFrame(
            {
                "PREJETA DELOVNA ENERGIJA ET": [100, 112],
                "PREJETA DELOVNA ENERGIJA VT": [60, 67],
                "PREJETA DELOVNA ENERGIJA MT": [40, 45],
                "ODDANA DELOVNA ENERGIJA ET": [10, 13],
                "ODDANA DELOVNA ENERGIJA VT": [6, 8],
                "ODDANA DELOVNA ENERGIJA MT": [4, 5],
            },
            index=pd.date_range("2025-01-01", periods=2).date,
        )

    def test_grouped_mojelektro_columns_pair_by_tariff(self):
        day = process_file(self.states())["2025-01"]["2025-01-01"]
        for tariff, expected, price in (("et", 9, 0.10890), ("vt", 5, 0.11990), ("mt", 4, 0.09790)):
            with self.subTest(tariff=tariff):
                self.assertEqual(day[f"poraba {tariff}"], expected)
                self.assertEqual(day[f"cena energije {tariff}"], round(expected * price, 3))
                self.assertEqual(day[f"tarifa za {tariff}"], price)
        self.assertEqual(day["delta prejeta delovna energija et"], 12)
        self.assertEqual(day["delta oddana delovna energija et"], 3)

    def test_interleaved_and_reordered_columns_produce_same_values(self):
        states = self.states()
        interleaved = [
            "PREJETA DELOVNA ENERGIJA ET", "ODDANA DELOVNA ENERGIJA ET",
            "PREJETA DELOVNA ENERGIJA VT", "ODDANA DELOVNA ENERGIJA VT",
            "PREJETA DELOVNA ENERGIJA MT", "ODDANA DELOVNA ENERGIJA MT",
        ]
        expected = process_file(states)
        self.assertEqual(process_file(states[interleaved]), expected)
        self.assertEqual(process_file(states[list(reversed(interleaved))]), expected)

    def test_tp02_csv_keeps_12_received_1_exported_and_11_net(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "poraba_tp02.csv"
            path.write_text(
                "Datum,Prejeta delovna energija ET,Oddana delovna energija ET\n"
                "2025-01-01,100,0\n2025-01-02,112,1\n",
                encoding="utf-8",
            )
            result = read_files({"csv": [str(path)], "xlsx": []})
        day = result["2025-01"]["2025-01-01"]
        self.assertEqual(day["delta prejeta delovna energija et"], 12)
        self.assertEqual(day["delta oddana delovna energija et"], 1)
        self.assertEqual(day["poraba et"], 11)

    def test_xlsx_year_boundary_supplies_last_delta_for_all_365_days(self):
        # A final January 1 state closes December 31; it is not a 2026 day record.
        states = pd.DataFrame(
            {
                "Datum": pd.date_range("2025-01-01", "2026-01-01"),
                "PREJETA DELOVNA ENERGIJA ET": 100 + np.arange(366) * 3,
                "PREJETA DELOVNA ENERGIJA VT": 60 + np.arange(366) * 2,
                "PREJETA DELOVNA ENERGIJA MT": 40 + np.arange(366),
                "ODDANA DELOVNA ENERGIJA ET": np.arange(366),
                "ODDANA DELOVNA ENERGIJA VT": np.arange(366),
                "ODDANA DELOVNA ENERGIJA MT": np.zeros(366),
            }
        )
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "synthetic_daily_states.xlsx"
            states.to_excel(path, index=False)
            result = read_files({"csv": [], "xlsx": [str(path)]})
        self.assertEqual(set(result), {f"2025-{month:02}" for month in range(1, 13)})
        days = {date: day for month in result.values() for date, day in month.items()}
        self.assertEqual(len(days), 365)
        self.assertEqual(days["2025-12-31"]["poraba et"], 2)
        self.assertTrue(all(day["poraba et"] == 2 for day in days.values()))
        self.assertEqual(sum(day["poraba et"] for day in days.values()), 730)

    def test_missing_exported_state_remains_unknown_not_zero(self):
        states = self.states()
        states.loc[states.index[1], "ODDANA DELOVNA ENERGIJA ET"] = np.nan
        result = process_file(states)
        day = result["2025-01"]["2025-01-01"]
        self.assertEqual(day["delta prejeta delovna energija et"], 12)
        self.assertIsNone(day["delta oddana delovna energija et"])
        self.assertIsNone(day["poraba et"])
        self.assertIsNone(day["cena energije et"])
        json.dumps(result, allow_nan=False)


if __name__ == "__main__":
    unittest.main()
