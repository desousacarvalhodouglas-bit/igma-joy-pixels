import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { EventsCarousel } from '@/components/EventsCarousel';

const Discover = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="px-4 pb-16 pt-32 md:px-8 md:pt-36">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <div className="max-w-3xl space-y-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Discover events
            </p>
            <h1 className="text-4xl font-medium leading-tight sm:text-5xl md:text-6xl">
              Explore, create and manage your next event.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Browse upcoming experiences, open event pages, or create your own in a few steps.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/create-event"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Create event
            </Link>
            <Link
              to="/my-events"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-secondary px-5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
            >
              My events
            </Link>
          </div>
        </section>

        <section className="mt-12 md:mt-16">
          <EventsCarousel />
        </section>
      </main>
    </div>
  );
};

export default Discover;
