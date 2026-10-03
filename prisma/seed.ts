import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean up existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin & User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@auratrix.com',
      password: adminPassword,
      role: 'ADMIN',
      permissions: JSON.stringify(['manage_products', 'manage_orders', 'view_metrics', 'manage_users']),
    },
  });

  const moderator = await prisma.user.create({
    data: {
      name: 'Store Moderator',
      email: 'mod@auratrix.com',
      password: adminPassword,
      role: 'MODERATOR',
      permissions: JSON.stringify(['manage_products', 'manage_orders']),
    },
  });

  const sampleUser = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      password: userPassword,
      role: 'USER',
      permissions: JSON.stringify([]),
    },
  });

  console.log('Created Users:', { admin: admin.email, mod: moderator.email, user: sampleUser.email });

  // Create Categories
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics & Audio',
      slug: 'electronics-audio',
      description: 'High performance audio gear, smart devices, and premium accessories.',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    },
  });

  const apparel = await prisma.category.create({
    data: {
      name: 'Luxury Apparel',
      slug: 'luxury-apparel',
      description: 'Designer outerwear, tailored fits, and urban street style.',
      image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop&q=80',
    },
  });

  const accessories = await prisma.category.create({
    data: {
      name: 'Wearables & Timepieces',
      slug: 'wearables-timepieces',
      description: 'Precision engineered smartwatches, chronographs, and sleek minimalist eyewear.',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    },
  });

  const home = await prisma.category.create({
    data: {
      name: 'Modern Home & Office',
      slug: 'modern-home-office',
      description: 'Minimalist workspace essentials, ambient lighting, and smart home items.',
      image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
    },
  });

  console.log('Created Categories:', [electronics.name, apparel.name, accessories.name, home.name]);

  // Create Products
  const products = [
    {
      title: 'AuraSound Noise-Canceling Wireless Headphones',
      description: 'Experience ultra-pure spatial sound with hybrid active noise cancellation, custom 40mm titanium drivers, and 45-hour battery performance.',
      price: 299.99,
      stockQuantity: 25,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80',
      ]),
      categoryId: electronics.id,
    },
    {
      title: 'StudioPro USB-C Condenser Microphone',
      description: 'Broadcast-quality 24-bit/96kHz cardioid condenser microphone with built-in pop filter, touch mute, and RGB audio level monitoring.',
      price: 149.50,
      stockQuantity: 8, // Low stock warning test
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
      ]),
      categoryId: electronics.id,
    },
    {
      title: 'Apex Smartwatch Chrono V2',
      description: 'Sapphire crystal display, ECG monitoring, dual-frequency GPS tracking, and titanium bezel crafted for endurance athletes.',
      price: 420.00,
      stockQuantity: 14,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
      ]),
      categoryId: accessories.id,
    },
    {
      title: 'Minimalist Matte Leather Backpack',
      description: 'Water-resistant full-grain Italian leather with dedicated 16-inch laptop compartment, hidden passport pocket, and magnetic clasps.',
      price: 185.00,
      stockQuantity: 4, // Low stock warning test
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
      ]),
      categoryId: accessories.id,
    },
    {
      title: 'Merino Wool Oversized Hooded Jacket',
      description: 'Thermal insulating 100% organic merino wool jacket with storm-guard zippers, custom silk lining, and weather resistant finish.',
      price: 240.00,
      stockQuantity: 30,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&auto=format&fit=crop&q=80',
      ]),
      categoryId: apparel.id,
    },
    {
      title: 'Luminary Ambient Desk Lamp & Charger',
      description: 'Dimmable warm LED arch light with integrated 15W Qi fast wireless charging pad and capacitive touch control wheel.',
      price: 89.99,
      stockQuantity: 19,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80',
      ]),
      categoryId: home.id,
    },
    {
      title: 'Ergonomic Curved Mechanical Keyboard',
      description: 'Hot-swappable tactile switches, gasket mounted aluminum body, customized PBT keycaps, and customizable RGB backlight.',
      price: 179.00,
      stockQuantity: 12,
      images: JSON.stringify([
        'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
      ]),
      categoryId: electronics.id,
    },
  ];

  for (const prod of products) {
    const { categoryId, ...rest } = prod;
    await prisma.product.create({
      data: {
        ...rest,
        categories: categoryId ? { connect: [{ id: categoryId }] } : undefined,
      },
    });
  }

  console.log(`Seeded ${products.length} products successfully.`);

  // Create initial order (for admin dashboard metrics testing)
  const product1 = await prisma.product.findFirst();
  if (product1) {
    await prisma.order.create({
      data: {
        userId: sampleUser.id,
        guestInfo: JSON.stringify({ name: 'John Doe', phone: '+1 555-0192', address: '742 Evergreen Terrace, Springfield', email: 'john@example.com' }),
        totalAmount: 299.99,
        status: 'DELIVERED',
        orderItems: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              price: product1.price,
            },
          ],
        },
      },
    });

    // Create a Guest Order as well
    await prisma.order.create({
      data: {
        userId: null, // Guest Checkout
        guestInfo: JSON.stringify({ name: 'Jane Smith (Guest)', phone: '+1 555-0841', address: '100 Ocean Drive, Miami, FL', email: 'jane.guest@gmail.com' }),
        totalAmount: 149.50,
        status: 'PENDING',
        orderItems: {
          create: [
            {
              productId: product1.id,
              quantity: 1,
              price: 149.50,
            },
          ],
        },
      },
    });

    // Seed Welcome & VIP Promo Codes
    await prisma.promoCode.upsert({
      where: { code: 'WELCOME10' },
      update: {},
      create: {
        code: 'WELCOME10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        description: 'كود خصم الترحيب للزوار الجدد (10% خصم) | Welcome discount for new visitors (10% OFF)',
        minOrderAmount: 0,
        isActive: true,
      },
    });

    await prisma.promoCode.upsert({
      where: { code: 'VIP10' },
      update: {},
      create: {
        code: 'VIP10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        description: '👑 كود خصم نادي كبار العملاء VIP (خصم 10%) | VIP Club 10% OFF discount code',
        minOrderAmount: 0,
        isActive: true,
      },
    });
  }

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
