import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// BrowserRouter does not reset scroll position between route changes, so a
// link clicked far down a long page (e.g. the footer) leaves the next page
// scrolled past its own content, appearing blank until a manual reload.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
