const text = 'Maecenas mattis. [feature X][images/feature-x.png]. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor.';

console.log(
  /\[(feature x)\]\[.*?\]/ig.exec(text),
  text.slice(17)
);