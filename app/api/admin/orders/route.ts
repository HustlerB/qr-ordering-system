import { NextResponse } from "next/server";

type OrderItem = {
  name: string;
  qty: number;
  price: number;
};

type Order = {
  id: string;
  customerName?: string;
  tableNumber?: string;
  status: string;
  total: number;
  createdAt: string;
  items?: OrderItem[];
};

export async function GET() {
  try {
    const orders: Order[] = [
      {
        id: "1003",
        customerName: "Aina",
        tableNumber: "T3",
        status: "New Order",
        total: 32.5,
        createdAt: new Date().toISOString(),
        items: [
          { name: "Chicken Chop", qty: 1, price: 18.5 },
          { name: "Iced Lemon Tea", qty: 2, price: 7.0 },
        ],
      },
      {
        id: "1002",
        customerName: "Walk-in",
        tableNumber: "T1",
        status: "Preparing",
        total: 14.0,
        createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        items: [{ name: "Latte", qty: 2, price: 7.0 }],
      },
    ];

    return NextResponse.json(
      { success: true, orders },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Admin orders API error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load orders" },
      { status: 500 }
    );
  }
}
