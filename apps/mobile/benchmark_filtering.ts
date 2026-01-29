type StudioRow = {
  uuid: string;
  name: string;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp?: string | null;
};

// Generate 10,000 studios
const studios: StudioRow[] = [];
for (let i = 0; i < 10000; i++) {
  studios.push({
    uuid: `uuid-${i}`,
    name: `Studio ${i} - Pilates and Yoga`,
    city: i % 2 === 0 ? "New York" : "Los Angeles",
    address: `${i} Main St, Suite ${i}`,
    latitude: 40.7128,
    longitude: -74.0060,
    whatsapp: `+123456789${i}`,
  });
}

const search = "new york";
const iterations = 1000;

console.log(`Benchmarking filtering of ${studios.length} items over ${iterations} iterations...`);

const start = performance.now();

for (let i = 0; i < iterations; i++) {
  // exact logic from the component
  const filtered = studios.filter((studio) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      studio.name?.toLowerCase().includes(needle) ||
      studio.city?.toLowerCase().includes(needle) ||
      studio.address?.toLowerCase().includes(needle)
    );
  });
}

const end = performance.now();
console.log(`Total time: ${(end - start).toFixed(2)}ms`);
console.log(`Average time per render: ${((end - start) / iterations).toFixed(4)}ms`);
