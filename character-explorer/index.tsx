import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { explain } from './explain';

import './styles.css';

function App() {
  const [character, setCharacter] = useState('');
  const parts = explain(character);

  return (
    <div className="App">
      <h1>Emoji (character) breakdown</h1>
      <input onChange={(e) => setCharacter(e.target.value)} value={character} />
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>binary</th>
              <th>byte</th>
              <th>decimal</th>
              <th>character</th>
            </tr>
          </thead>
          <tbody>
            {parts.map(({ binary, byte, decimal, char }, key) => (
              <tr key={key}>
                <td>
                  {binary.map((b, i) => (
                    <kbd key={'bin' + i}>{b}</kbd>
                  ))}
                </td>
                <td>
                  <kbd>{byte}</kbd>
                </td>
                <td>
                  <kbd>{decimal}</kbd>
                </td>
                <td>
                  <kbd>{char}</kbd>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        length: <code>{character.length}</code>
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
