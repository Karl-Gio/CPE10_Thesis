import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# 1. Load the data
try:
    df = pd.read_csv("PARAMETERS.csv")
except FileNotFoundError:
    print("File not found. Please ensure the CSV is in the same folder.")
    raise

# Clean column names just in case may extra spaces
df.columns = df.columns.str.strip()

# 2. Select Features (X) and Target (y)
features = [
    "Ambient Temperature",
    "Ambient Humidity",
    "Soil Temperature",
    "Soil Moisture",
    "Light Duration",
]

X = df[features]
y = df["Days to germinate"]

# 3. Split the data (80% Train, 20% Test)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 4. Train the Model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 5. Evaluate
predictions = model.predict(X_test)
mae = mean_absolute_error(y_test, predictions)
r2 = r2_score(y_test, predictions)

print("--- Model Training Complete ---")
print(f"Mean Absolute Error: {mae:.4f} days")
print(f"R2 Score: {r2:.4f}")

# 6. Predict Germination for Sample Conditions
# Temp=25, Hum=50, SoilTemp=25, Moisture=50, Light=90
sample_env = pd.DataFrame(
    [[25.0, 50.0, 25.0, 50.0, 90.0]],
    columns=features
)
predicted_days = model.predict(sample_env)

print("\n--- Germination Prediction ---")
print(f"Predicted Time to Germinate: {predicted_days[0]:.2f} days")

# 7. Feature Importance
importances = pd.Series(model.feature_importances_, index=features).sort_values(ascending=False)
print("\n--- Feature Importance (Impact on Speed) ---")
print(importances.map(lambda x: f"{x*100:.2f}%"))