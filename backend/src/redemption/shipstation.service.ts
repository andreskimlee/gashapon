import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

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
  weightGrams?: number | null;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: Date;
  status: string;
}

@Injectable()
export class ShipStationService {
  private apiClient: AxiosInstance;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey =
      this.configService.get<string>("SHIPENGINE_API_KEY") ||
      this.configService.get<string>("SHIPSTATION_API_KEY") ||
      "";
    const nodeEnv = this.configService.get<string>("NODE_ENV") || "development";

    // Only require credentials in production
    if (nodeEnv === "production" && !this.apiKey) {
      throw new Error("ShipStation API key must be configured in production");
    }

    this.apiClient = axios.create({
      baseURL: "https://api.shipengine.com",
      headers: {
        "API-Key": this.apiKey || "placeholder-auth",
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    if (!this.apiKey) {
      console.warn(
        "⚠️  ShipStation API key not configured - redemption will fail. Set SHIPENGINE_API_KEY to enable."
      );
    }
  }

  /**
   * Create a shipping label via ShipStation API (ShipEngine)
   */
  async createShipment(data: ShipmentData): Promise<Shipment> {
    try {
      const shipFrom = this.getShipFromAddress();
      const { carrierId, serviceCode } = this.getCarrierConfig();
      const packageConfig = this.getPackageConfig();

      if (!shipFrom) {
        throw new InternalServerErrorException(
          "Ship-from address is not configured for ShipStation API"
        );
      }

      const weightValue =
        data.weightGrams && data.weightGrams > 0
          ? this.convertWeightFromGrams(
              data.weightGrams,
              packageConfig.weightUnit
            )
          : packageConfig.weight;

      const labelPayload = {
        shipment: {
          carrier_id: carrierId,
          service_code: serviceCode,
          ship_to: {
            name: data.name,
            address_line1: data.address,
            city_locality: data.city,
            state_province: data.state,
            postal_code: data.zip,
            country_code: data.country,
          },
          ship_from: {
            name: shipFrom.name,
            address_line1: shipFrom.street1,
            address_line2: shipFrom.street2 || undefined,
            city_locality: shipFrom.city,
            state_province: shipFrom.state,
            postal_code: shipFrom.postalCode,
            country_code: shipFrom.country,
          },
          packages: [
            {
              weight: {
                value: Number(weightValue.toFixed(3)),
                unit: packageConfig.weightUnit,
              },
              dimensions: {
                length: packageConfig.length,
                width: packageConfig.width,
                height: packageConfig.height,
                unit: packageConfig.dimensionUnit,
              },
            },
          ],
          advanced_options: {
            custom_field1: `NFT Redemption - ${data.orderId}`,
          },
        },
        validate_address: "no_validation",
        label_download_type: "url",
        label_format: "pdf",
        label_layout: "4x6",
      };

      const labelResponse = await this.apiClient.post(
        "/v1/labels",
        labelPayload
      );
      const label = labelResponse.data;
      const carrierCode = label.carrier_code || label.carrier_id || "unknown";
      const trackingNumber = label.tracking_number || "";
      const shipDate = label.ship_date ? new Date(label.ship_date) : new Date();

      return {
        id: label.label_id,
        trackingNumber,
        carrier: carrierCode,
        estimatedDelivery: shipDate,
        status: "processing",
      };
    } catch (error) {
      console.error(
        "ShipStation API error:",
        error.response?.data || error.message
      );
      throw new InternalServerErrorException(
        `Failed to create shipment: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Get shipment status
   */
  async getShipmentStatus(_shipmentId: string): Promise<Shipment> {
    throw new InternalServerErrorException(
      "Shipment status lookup is not implemented for ShipStation API"
    );
  }

  private getShipFromAddress(): {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null {
    const name = this.configService.get<string>("SHIPSTATION_SHIP_FROM_NAME");
    const street1 = this.configService.get<string>(
      "SHIPSTATION_SHIP_FROM_STREET1"
    );
    const street2 = this.configService.get<string>(
      "SHIPSTATION_SHIP_FROM_STREET2"
    );
    const city = this.configService.get<string>("SHIPSTATION_SHIP_FROM_CITY");
    const state = this.configService.get<string>("SHIPSTATION_SHIP_FROM_STATE");
    const postalCode = this.configService.get<string>(
      "SHIPSTATION_SHIP_FROM_POSTAL_CODE"
    );
    const country = this.configService.get<string>(
      "SHIPSTATION_SHIP_FROM_COUNTRY"
    );

    if (!name || !street1 || !city || !state || !postalCode || !country) {
      return null;
    }

    return {
      name,
      street1,
      ...(street2 ? { street2 } : {}),
      city,
      state,
      postalCode,
      country,
    };
  }

  private getCarrierConfig(): { carrierId: string; serviceCode: string } {
    const carrierId = this.configService.get<string>("SHIPENGINE_CARRIER_ID");
    const serviceCode = this.configService.get<string>(
      "SHIPENGINE_SERVICE_CODE"
    );

    if (!carrierId || !serviceCode) {
      throw new InternalServerErrorException(
        "Carrier configuration missing. Set SHIPENGINE_CARRIER_ID and SHIPENGINE_SERVICE_CODE."
      );
    }

    return { carrierId, serviceCode };
  }

  private getPackageConfig(): {
    weight: number;
    weightUnit: "pound" | "ounce" | "kilogram" | "gram";
    length: number;
    width: number;
    height: number;
    dimensionUnit: "inch" | "centimeter";
  } {
    const weight = Number(
      this.configService.get<string>("SHIPENGINE_PACKAGE_WEIGHT") || "0.5"
    );
    const length = Number(
      this.configService.get<string>("SHIPENGINE_PACKAGE_LENGTH") || "6"
    );
    const width = Number(
      this.configService.get<string>("SHIPENGINE_PACKAGE_WIDTH") || "6"
    );
    const height = Number(
      this.configService.get<string>("SHIPENGINE_PACKAGE_HEIGHT") || "4"
    );
    const weightUnit = (this.configService.get<string>(
      "SHIPENGINE_PACKAGE_WEIGHT_UNIT"
    ) || "pound") as "pound" | "ounce" | "kilogram" | "gram";
    const dimensionUnit = (this.configService.get<string>(
      "SHIPENGINE_PACKAGE_DIMENSION_UNIT"
    ) || "inch") as "inch" | "centimeter";

    return {
      weight,
      weightUnit,
      length,
      width,
      height,
      dimensionUnit,
    };
  }

  private convertWeightFromGrams(
    grams: number,
    unit: "pound" | "ounce" | "kilogram" | "gram"
  ): number {
    switch (unit) {
      case "kilogram":
        return grams / 1000;
      case "gram":
        return grams;
      case "ounce":
        return grams / 28.349523125;
      case "pound":
      default:
        return grams / 453.59237;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    // TODO: Implement ShipStation webhook signature verification
    // ShipStation API uses HMAC verification for webhooks
    return true; // Placeholder
  }
}
