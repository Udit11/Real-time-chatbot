// src/App.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Optional: silence React Router future-flag console warnings in tests
// (uncomment if you want to keep test output quieter)
// const originalWarn = console.warn;
// beforeAll(() => {
//   console.warn = (msg?: any, ...args: any[]) => {
//     if (typeof msg === 'string' && msg.includes('React Router Future Flag Warning')) {
//       return;
//     }
//     originalWarn(msg, ...args);
//   };
// });
// afterAll(() => {
//   console.warn = originalWarn;
// });

test('renders top app title', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  // Replace this matcher with any visible string your app renders.
  // From your test DOM dump, the app bar shows "Real-Time Chatbot Admin"
  const titleElement = screen.getByText(/Real-Time Chatbot Admin/i);
  expect(titleElement).toBeInTheDocument();
});
