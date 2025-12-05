const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Detectar si estamos en CI (como Render)
const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';

beforeAll(async () => {
  if (isCI) {
    // Usar base de datos en memoria para CI
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB Memory Server for testing (CI)');
  } else {
    // Usar base de datos local definida en .env
    await mongoose.connect(process.env.MONGODB_URI_TEST, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to local test database');
  }
});

// Limpiar después de cada prueba
afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cerrar conexión al terminar todas las pruebas
afterAll(async () => {
  await mongoose.connection.close();

  if (mongoServer) {
    await mongoServer.stop();
  }

  console.log('🔒 MongoDB test database connection closed');
});
