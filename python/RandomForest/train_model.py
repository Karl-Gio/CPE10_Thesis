import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib

def train_and_save():
    # 1. Load dataset
    df = pd.read_csv("PARAMETERS.csv")

    # Clean column names (important!)
    df.columns = df.columns.str.strip()

    # 2. Define features (NO Pechay Count)
    features = [
        "Ambient Temperature",
        "Ambient Humidity",
        "Soil Temperature",
        "Soil Moisture",
        "Light Duration",
    ]

    X = df[features]
    y = df["Days to germinate"]

    # 3. Train model
    model = RandomForestRegressor(
        n_estimators=150,   # slightly stronger
        max_depth=10,       # prevents overfitting
        random_state=42
    )
    model.fit(X, y)

    # 4. Save BOTH model + feature order (VERY IMPORTANT)
    joblib.dump({
        "model": model,
        "features": features
    }, "germination_model.pkl")

    print("✅ Model trained and saved (with feature list).")


if __name__ == "__main__":
    train_and_save()