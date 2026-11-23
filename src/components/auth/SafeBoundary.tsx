// ─────────────────────────────────────────────────────────────
// SafeBoundary — isolates optional UI (notices, background sync) so a bug in
// it renders nothing instead of taking down the page or the whole app.
// ─────────────────────────────────────────────────────────────
import { Component, type ReactNode } from 'react';

interface Props {
  name: string;
  children: ReactNode;
}

export default class SafeBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(`${this.props.name} crashed and was hidden`, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
