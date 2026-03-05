import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
    it('renders the app container', () => {
        render(
            <App>
                <div data-testid="child">Hello</div>
            </App>
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });
});
