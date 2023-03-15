import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrdersModule } from './modules/orders/order.module';




@Module({
  imports: [
    // @ts-ignore
    OrdersModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
