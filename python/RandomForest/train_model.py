import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

def train_and_save():
    # =====================================================
    # 1. Load CLEAN training dataset
    # =====================================================
    df = pd.read_csv("batches.csv")
    df.columns = df.columns.str.strip()

    # =====================================================
    # 2. Check required columns
    # =====================================================
    required_cols = [
        "batch_id",
        "Ambient Temperature",
        "Ambient Humidity",
        "Soil Temperature",
        "Soil Moisture",
        "Light Duration",
        "date_planted",
        "actual_germination_date",
    ]

    missing = [col for col in required_cols if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # =====================================================
    # 3. Convert numeric/date columns
    # =====================================================
    numeric_cols = [
        "Ambient Temperature",
        "Ambient Humidity",
        "Soil Temperature",
        "Soil Moisture",
        "Light Duration",
    ]

    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["date_planted"] = pd.to_datetime(df["date_planted"], errors="coerce")
    df["actual_germination_date"] = pd.to_datetime(df["actual_germination_date"], errors="coerce")

    df = df.dropna(subset=required_cols).reset_index(drop=True)

    # =====================================================
    # 4. Create target from actual dates
    # =====================================================
    df["Days to germinate"] = (
        (df["actual_germination_date"] - df["date_planted"]).dt.total_seconds() / 86400.0
    )

    # Optional sanity check
    if (df["Days to germinate"] <= 0).any():
        raise ValueError("Found non-positive Days to germinate. Check your date columns.")

    # =====================================================
    # 5. Define features and target
    # =====================================================
    features = [
        "Ambient Temperature",
        "Ambient Humidity",
        "Soil Temperature",
        "Soil Moisture",
        "Light Duration",
    ]

    X = df[features]
    y = df["Days to germinate"]

    # =====================================================
    # 6. Train model
    # =====================================================
    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=10,
        random_state=42
    )
    model.fit(X, y)

    # =====================================================
    # 7. Save model + feature order
    # =====================================================
    joblib.dump({
        "model": model,
        "features": features,
        "target": "Days to germinate",
        "training_source": "pc.csv (derived from actual_germination_date - date_planted)"
    }, "germination_model.pkl")

    print("Model trained and saved using actual germination dates from pc.csv")
    print(df[["batch_id", "Days to germinate"]].head())

if __name__ == "__main__":
    train_and_save()