import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { REDIS_CLIENT } from '@app/shared';
import { type RedisClientType } from 'redis';
import { ApiLog } from './entities/log.entity';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';

@Injectable()
export class AnalyticsServiceService {
  private subClient!: RedisClientType;

  constructor(
    @InjectRepository(ApiLog)
    private readonly logRepository: Repository<ApiLog>,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: RedisClientType,
  ) {}

  async onModuleInit() {
    console.log(
      '[Analytics Service] Initializing Redis Pub/Sub subscription...',
    );

    this.subClient = this.redisClient.duplicate() as RedisClientType;
    await this.subClient.connect();

    await this.subClient.subscribe('api-events', async (message) => {
      try {
        const eventData = JSON.parse(message);
        console.log(
          `[Analytics Service] Received event from Service A:`,
          eventData,
        );

        const newLog = this.logRepository.create({
          action: eventData.action,
          eventTimestamp: eventData.timestamp.toString(),
        });

        const savedLog = await this.logRepository.save(newLog);
        console.log(
          `[Analytics Service] Log successfully saved to PostgreSQL. ID: ${savedLog.id}`,
        );
      } catch (error) {
        console.error(
          '[Analytics Service] Failed to process or save intercepted event:',
          error,
        );
      }
    });

    console.log(
      '[Analytics Service] Successfully subscribed to channel: "api-events"',
    );
  }

  async getLogs(action?: string, startDate?: string, endDate?: string) {
    const queryBuilder = this.logRepository.createQueryBuilder('log');

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  async generatePdfReport(): Promise<Buffer> {
    const actions = ['fetch', 'upload', 'search'];
    const stats: Record<string, number> = {};

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    for (const action of actions) {
      try {
        const key = `action:${action}`;
        const points = (await this.redisClient.sendCommand([
          'TS.RANGE',
          key,
          oneDayAgo.toString(),
          now.toString(),
        ])) as any[];

        stats[action] = points ? points.length : 0;
      } catch (e) {
        stats[action] = 0;
      }
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      doc
        .fillColor('#1e293b')
        .fontSize(24)
        .text('System Analytics Report', { align: 'center' });
      doc
        .fontSize(10)
        .fillColor('#64748b')
        .text(`Generated on: ${new Date().toLocaleString()}`, {
          align: 'center',
        });
      doc.moveDown(2);

      doc
        .fillColor('#0f172a')
        .fontSize(14)
        .text('API Activity Summary (Last 24 Hours):', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(12).fillColor('#334155');
      doc.text(
        `• Fetch Operations (Service A from DummyJSON): ${stats['fetch']} times`,
      );
      doc.text(
        `• Upload Operations (Manual file processing): ${stats['upload']} times`,
      );
      doc.text(
        `• Search Requests (Aggregated product queries): ${stats['search']} times`,
      );
      doc.moveDown(3);

      doc
        .fillColor('#0f172a')
        .fontSize(14)
        .text('Visual Metrics Chart:', { underline: true });
      doc.moveDown(1);

      const chartX = 100;
      const chartY = 450;
      const barWidth = 60;
      const spacing = 70;
      const maxBarHeight = 150;

      const maxVal = Math.max(...Object.values(stats), 1);

      actions.forEach((action, index) => {
        const val = stats[action];
        const barHeight = (val / maxVal) * maxBarHeight;

        const colors: Record<string, string> = {
          fetch: '#3b82f6',
          upload: '#10b981',
          search: '#8b5cf6',
        };
        doc.fillColor(colors[action]);

        doc
          .rect(
            chartX + index * (barWidth + spacing),
            chartY - barHeight,
            barWidth,
            barHeight,
          )
          .fill();

        doc
          .fillColor('#0f172a')
          .fontSize(10)
          .text(
            val.toString(),
            chartX + index * (barWidth + spacing),
            chartY - barHeight - 15,
            { width: barWidth, align: 'center' },
          );

        doc
          .fillColor('#64748b')
          .fontSize(10)
          .text(
            action.toUpperCase(),
            chartX + index * (barWidth + spacing),
            chartY + 10,
            { width: barWidth, align: 'center' },
          );
      });

      doc
        .strokeColor('#cbd5e1')
        .lineWidth(2)
        .moveTo(80, chartY)
        .lineTo(480, chartY)
        .stroke();

      doc.end();
    });
  }

  async onModuleDestroy() {
    if (this.subClient) {
      await this.subClient.disconnect();
    }
  }
}
