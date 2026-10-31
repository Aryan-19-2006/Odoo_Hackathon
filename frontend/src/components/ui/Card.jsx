import { classNames } from '../../utils/classNames.js';

export default function Card({ children, className }) {
  return (
    <section
      className={classNames('rounded-card border border-line bg-white shadow-card', className)}
    >
      {children}
    </section>
  );
}
