import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { KamButton } from './KamButton';
import { render, fireEvent } from '@testing-library/react';

describe('KamButton', () => {
  it('рендерит текст и реагирует на клик', () => {
    const handleClick = vi.fn();
    const { getByRole } = render(
      <KamButton onClick={handleClick} ariaLabel="Тестовая кнопка">Тест</KamButton>
    );
    const btn = getByRole('button', { name: 'Тестовая кнопка' });
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalled();
  });

  it('отключается при disabled', () => {
    const { getByRole } = render(
      <KamButton disabled ariaLabel="Disabled">Disabled</KamButton>
    );
    const btn = getByRole('button', { name: 'Disabled' });
    expect(btn).toBeDisabled();
  });
});
