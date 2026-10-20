# Convert src/data/seedData.ts into seed_data_export.js
with open('src/data/seedData.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove TypeScript type annotations
clean_code = code.replace(": AdSpot[]", "").replace(": AdReservation[]", "").replace(": number", "").replace(": string", "")

with open('scripts/seed_data_export.js', 'w', encoding='utf-8') as f:
    f.write(clean_code)

print("Created scripts/seed_data_export.js")
