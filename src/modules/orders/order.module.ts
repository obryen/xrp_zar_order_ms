import { Module } from '@nestjs/common';
import { OrdersController } from './order.controller';
import { OrdersService } from './order.service';
// import { RedisModule } from 'nestjs-redis';


@Module({
  imports: [
    // RedisModule.register({
    //   host: 'localhost',
    //   port: 6379,
    // }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule { }