import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface ShipmentData {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  sku: string;
  orderId: string;
  email?: string;
}

export interface Shipment {
  id: number;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: Date;
  status: string;
}

@Injectable()
export class ShipStationService {
  private apiClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SHIPSTATION_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('SHIPSTATION_API_SECRET') || '';
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';

    // Only require credentials in production
    if (nodeEnv === 'production' && (!this.apiKey || !this.apiSecret)) {
      throw new Error('ShipStation API credentials must be configured in production');
    }

    // Create axios instance with basic auth (or placeholder for dev)
    const auth = (this.apiKey && this.apiSecret)
      ? Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')
      : 'placeholder-auth';

    this.apiClient = axios.create({
      baseURL: 'https://ssapi.shipstation.com',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (!this.apiKey || !this.apiSecret) {
      console.warn('⚠️  ShipStation API credentials not configured - redemption will fail. Set SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET to enable.');
    }
  }

  /**
   * Create a shipment order in ShipStation
   */
  async createShipment(data: ShipmentData): Promise<Shipment> {
    try {
      // First, get the product/sku details to get weight/dimensions
      const product = await this.getProductBySku(data.sku);

      // Create order in ShipStation
      const orderPayload = {
        orderNumber: data.orderId,
        orderDate: new Date().toISOString(),
        orderStatus: 'awaiting_shipment',
        customerUsername: data.email || '',
        customerEmail: data.email || '',
        shipTo: {
          name: data.name,
          street1: data.address,
          city: data.city,
          state: data.state,
          postalCode: data.zip,
          country: data.country,
        },
        items: [
          {
            sku: data.sku,
            name: product?.name || `Gachapon Prize - ${data.sku}`,
            quantity: 1,
            unitPrice: 0, // Prize, not sold
            weight: {
              value: product?.weight || 0.5,
              units: 'pounds',
            },
          },
        ],
        advancedOptions: {
          customField1: `NFT Redemption - ${data.orderId}`,
        },
      };

      const orderResponse = await this.apiClient.post('/orders/createorder', orderPayload);

      const orderId = orderResponse.data.orderId;

      // Create label (this will generate tracking number)
      const labelResponse = await this.createLabel(orderId);

      return {
        id: orderId,
        trackingNumber: labelResponse.trackingNumber,
        carrier: labelResponse.carrierCode,
        estimatedDelivery: new Date(labelResponse.shipDate),
        status: 'processing',
      };
    } catch (error) {
      console.error('ShipStation API error:', error.response?.data || error.message);
      throw new InternalServerErrorException(
        `Failed to create shipment: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get shipment status
   */
  async getShipmentStatus(shipmentId: number): Promise<Shipment> {
    try {
      const response = await this.apiClient.get(`/orders/${shipmentId}`);
      const order = response.data;

      return {
        id: order.orderId,
        trackingNumber: order.trackingNumber || '',
        carrier: order.carrierCode || '',
        estimatedDelivery: order.shipDate ? new Date(order.shipDate) : new Date(),
        status: order.orderStatus || 'unknown',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to get shipment status: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Create shipping label for an order
   */
  private async createLabel(orderId: number): Promise<any> {
    try {
      const response = await this.apiClient.post('/orders/createlabelfororder', {
        orderId,
      });
      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create label: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get product by SKU (for weight/dimensions)
   */
  private async getProductBySku(sku: string): Promise<any> {
    try {
      const response = await this.apiClient.get('/products', {
        params: { sku },
      });
      return response.data.products?.[0] || null;
    } catch (error) {
      // If product doesn't exist, return null (we'll use defaults)
      return null;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    // TODO: Implement ShipStation webhook signature verification
    // ShipStation uses HMAC-SHA256 with the API secret
    return true; // Placeholder
  }
}

