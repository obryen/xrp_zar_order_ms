import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { REDIS_URI } from '../../common/constants';
import { createClient } from 'redis';
import { Decimal  } from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import * as util from 'util';
import { OrderRequestDto, OrderResponseDto, SideEnum, UpdateOrderDto } from './dtos/order-dtos';
import Redis from 'ioredis';


const MAX_DECIMAL_PLACES = 6;
@Injectable()
export class OrdersService {
  private readonly redisClient: Redis;
  logger: Logger;

  constructor() {
    this.logger = new Logger('OrdersService');
    this.redisClient = this.initializeClient('[RedisService]');

  }


  initializeClient(serviceName: string) {
    const redisClient = new Redis(REDIS_URI);

    redisClient.on('ready', () => {
      this.logger.log(`Initialised redis client for ${serviceName}`);

      redisClient.setex(
        `connection_status: ${serviceName} : ${new Date().getSeconds()}`,
        360,
        `ready at ${new Date().toTimeString()} `,
      );
    });

    redisClient.on('error', (err) => {
      this.logger.error(
        err,
        `Redis service ${serviceName} encountered an error`,
      );
      throw new Error(err);
    });

    return redisClient;
  }

  validateAndStandardizeInput(payLoad: OrderRequestDto): OrderRequestDto {
    // Validate request payload
    if (!payLoad || !payLoad.price || !payLoad.quote_amount || !payLoad.side) {
      throw new BadRequestException('Invalid payload');
    }

    if (!Object.values(SideEnum).includes(payLoad.side)) {
      throw new BadRequestException(`Side can only be one of: ${Object.keys(SideEnum)}`)
    }

    return {
      price: payLoad.price,
      quote_amount: payLoad.quote_amount,
      side: payLoad.side
    }
  }

  convertQuoteAmountToBaseAmount(price: Decimal, quoteAmount: Decimal): Decimal {
    const baseAmount = quoteAmount.dividedBy(price);
    return baseAmount.toDP(MAX_DECIMAL_PLACES,1);
  }

  async createOrder(payLoad: OrderRequestDto): Promise<OrderResponseDto> {

    const validatedPayload = this.validateAndStandardizeInput(payLoad)

    const uuid = uuidv4();
    const baseAmount = this.convertQuoteAmountToBaseAmount(
      new Decimal(validatedPayload.price),
      new Decimal(validatedPayload.quote_amount)
    );
    // const baseAmount = new Decimal(validatedPayload.quote_amount).dividedBy(validatedPayload.price);
    const valueToStore: OrderResponseDto = {
      ...validatedPayload,
      base_amount: baseAmount,
      uuid
    }
    // store values in redis
    await this.redisClient.hmset(uuid, valueToStore);
    return valueToStore;
  }

  async getOrder(uuid: string): Promise<OrderResponseDto> {
    if (!uuid) {
      throw new BadRequestException('invalid uuid')
    }
    const savedOrder = await this.redisClient.hgetall(uuid);
    if (!savedOrder || !savedOrder['uuid']) {
      throw new NotFoundException(`Order with uuid ${uuid} not found`);
    }

    return {
      base_amount: new Decimal(savedOrder['base_amount']),
      price: new Decimal(savedOrder['price']),
      quote_amount: new Decimal(savedOrder['quote_amount']),
      side: savedOrder['side'] as SideEnum,
      uuid: savedOrder['uuid']
    };
  }

  async cancelOrder(uuid: string): Promise<string> {
    await this.getOrder(uuid);
    await this.redisClient.del(uuid);
    return uuid;
  }

  async updateOrder(payload: UpdateOrderDto): Promise<OrderResponseDto> {
    const { uuid, price, quote_amount } = payload
    const exisitingOrder = await this.getOrder(uuid);
    const newQuoteAmount = quote_amount || exisitingOrder.quote_amount;
    const newPriceAmount = price || exisitingOrder.price

    const updatedOrder: OrderResponseDto = {
      uuid,
      price: price !== undefined ? new Decimal(price) : exisitingOrder.price,
      quote_amount: quote_amount !== undefined ? new Decimal(quote_amount) : exisitingOrder.quote_amount,
      base_amount: this.convertQuoteAmountToBaseAmount(
        new Decimal(newPriceAmount),
        new Decimal(newQuoteAmount)
      ),
      side: exisitingOrder.side,
    };
    try {
      // use multi to run everthing under one atomic transaction
      const redisClient = this.redisClient.multi();
      if (price !== undefined) {

        const priceDiff = updatedOrder.price.minus(exisitingOrder.price).toString();
        redisClient.hincrbyfloat(uuid, 'price', priceDiff);
        const baseDiff = updatedOrder.base_amount.minus(exisitingOrder.base_amount).toString();
        redisClient.hincrbyfloat(uuid, 'base_amount', baseDiff);
      }
      if (quote_amount !== undefined) {
        const quoteDiff = updatedOrder.quote_amount.minus(exisitingOrder.quote_amount).toString();
        redisClient.hincrbyfloat(uuid, 'quote_amount', quoteDiff);
        const baseDiff = updatedOrder.base_amount.minus(exisitingOrder.base_amount).toString();
        redisClient.hincrbyfloat(uuid, 'base_amount', baseDiff);
      }
      await redisClient.exec();
      return updatedOrder;
    } catch (error) {
      console.log('[updateOrder]', util.inspect(error))
      throw new InternalServerErrorException('Something went wrong with [updateOrder]')
    }

  }


}