import pathlib

t = pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/styles/components.css').read_text(encoding='utf-8')

old = '''.schema-dictionary-modal {
  background: #0F172A;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 1100px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15);
  overflow: hidden;
}'''

new = '''.schema-dictionary-modal {
  background: #0F172A;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 20px;
  max-width: 900px;
  margin: 0 auto;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15);
  overflow: hidden;
}'''

if old in t:
    t = t.replace(old, new)
    pathlib.Path('C:/Users/Aditya/Desktop/MINOR PROJECT/AI Business/Project-2/styles/components.css').write_text(t, encoding='utf-8')
    print('CSS updated successfully')
else:
    print('Pattern not found')
    idx = t.find('.schema-dictionary-modal')
    print(f'Found at index: {idx}')
    print(t[idx:idx+500])