with open('scripts/seed_data_export.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

clean_lines = [l for l in lines if not l.strip().startswith('import ')]

with open('scripts/seed_data_export.js', 'w', encoding='utf-8') as f:
    f.writelines(clean_lines)

print("Cleaned import lines in seed_data_export.js")
