import { Suspense } from 'react';
import ExploreClient from './explore/explore-client';

export default function HomePage() {
  return <main style={{ minHeight: '100vh', background: 'var(--bg)' }}><Suspense fallback={null}><ExploreClient basePath='/' /></Suspense></main>;
}
