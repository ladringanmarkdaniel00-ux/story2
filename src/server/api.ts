import { Router, Request, Response, NextFunction } from 'express';
import { calculateGeoPrice } from '../lib/pricing/geoPricingEngine';
import { sanitizeCountryCode } from '../lib/pricing/clientCountry';

export const apiRouter = Router();

// Healthcheck & Readiness Probe
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Direct Binary / Media Upload Endpoint
apiRouter.post('/upload', (req: Request, res: Response) => {
  const contentType = req.headers['content-type'] || '';
  const isImage = contentType.startsWith('image/');
  const isVideo = contentType.startsWith('video/');
  const isOctet = contentType.startsWith('application/octet-stream');

  if (!isImage && !isVideo && !isOctet) {
    res.status(400).json({
      success: false,
      error: 'Unsupported media format. Content-Type must be image/* or video/*.',
    });
    return;
  }

  const payloadLength = Buffer.isBuffer(req.body) ? req.body.length : 0;
  if (payloadLength === 0) {
    res.status(400).json({
      success: false,
      error: 'Uploaded file payload is empty (0 bytes).',
    });
    return;
  }

  const generatedFileKey = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const resourceUrl = `/uploads/${generatedFileKey}`;

  res.status(200).json({
    success: true,
    url: resourceUrl,
    key: generatedFileKey,
    mimeType: contentType,
    sizeBytes: payloadLength,
  });
});

// Dynamic Geo-Pricing Engine Route
apiRouter.post('/geo-price', async (req: Request, res: Response) => {
  try {
    const { sku, basePricePHP, overrideCountry } = req.body;

    if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Parameter "sku" must be a non-empty string.',
      });
      return;
    }

    if (typeof basePricePHP !== 'number' || !Number.isFinite(basePricePHP) || basePricePHP <= 0) {
      res.status(400).json({
        success: false,
        error: 'Parameter "basePricePHP" must be a positive finite number.',
      });
      return;
    }

    const sanitizedCountry = overrideCountry ? sanitizeCountryCode(overrideCountry) : undefined;
    const apiKey = process.env.GEMINI_API_KEY;

    const pricingPayload = await calculateGeoPrice(
      sku.trim(),
      basePricePHP,
      sanitizedCountry || undefined,
      apiKey,
      req.headers
    );

    res.status(200).json(pricingPayload);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal calculation error';
    res.status(500).json({
      success: false,
      error: errorMsg,
      requestId: req.headers['x-request-id'] as string,
    });
  }
});

// Strict API 404 Catcher
apiRouter.all('/*all', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found.',
  });
});
