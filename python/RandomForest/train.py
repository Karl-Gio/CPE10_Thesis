import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

# 1. Load the NEWEST data (The one with 2-3 days range)
df = pd.read_csv('updated_pechay_research_data.csv')

# 2. Select Features (X) and Target (y)
# Features stay the same, but Target is now Days_to_Germinate
features = ['Ambient_Temp_C', 'Ambient_Hum_Percent', 'Light_Intensity_lx', 'Soil_Moisture_Percent', 'Soil_pH']
X = df[features]
y = df['Days_to_Germinate']

# 3. Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. Initialize and Train the Random Forest Regressor
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# 5. Evaluate the model
predictions = model.predict(X_test)
mae = mean_absolute_error(y_test, predictions)
r2 = r2_score(y_test, predictions)

print(f"--- Model Training Complete ---")
print(f"Mean Absolute Error: {mae:.2f} days")
print(f"R2 Score: {r2:.2f}")

# 6. Predict Germination SPEED for new conditions
# We use a DataFrame instead of a list to avoid the 'feature names' warning
optimized_env = pd.DataFrame([[25.0, 75.0, 600.0, 30.0, 6.5]], columns=features)

predicted_days = model.predict(optimized_env)

print(f"\n--- Germination Prediction ---")
print(f"Environmental Input: Temp=25C, Hum=75%, Moisture=30%, pH=6.5")
print(f"Predicted Time to Germinate: {predicted_days[0]:.1f} days")

# 7. Check Feature Importance (To know HOW to improve speed)
importances = model.feature_importances_
print("\n--- Impact on Germination Speed ---")
for name, imp in zip(features, importances):
    print(f"{name}: {imp*100:.1f}% impact")