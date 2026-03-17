fetch('https://docs.google.com/spreadsheets/d/1JTS32TlyYkWOFrP-v60KSSfZn25uA49KsTGrT6TFFKc/export?format=csv&gid=507872400')
  .then(res => res.text())
  .then(text => {
    const lines = text.split('\n');
    const withValor = lines.filter(l => {
      const cols = l.split(',');
      return cols.length > 5 && cols[5].trim() !== '' && cols[5].trim() !== 'valor';
    });
    console.log('Total with valor:', withValor.length);
    console.log(withValor.slice(0, 5).join('\n'));
  });
