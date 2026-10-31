import { Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import PageHeader from '../components/ui/PageHeader.jsx';
import { routePaths } from '../routes/routePaths.js';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <PageHeader
        title="Page not found"
        description="The page you requested does not exist or may have moved."
        className="mb-6"
      />
      <Button as={Link} to={routePaths.dashboard}>
        Return to overview
      </Button>
    </div>
  );
}
