import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { OrderRequestDto, OrderResponseDto, UpdateOrderDto } from './dtos/order-dtos';
import { OrdersService } from './order.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrdersService) { }


  @Get(':id')
  async getOrderById(@Param('id') id: string) {
   return await this.orderService.getOrder(id);
  }

  @Post()
  async createOrders(@Body() payload: OrderRequestDto): Promise<OrderResponseDto> {
    return await this.orderService.createOrder(payload);
  }

  @Put()
  async updateOrders(@Body() payload: UpdateOrderDto):Promise<OrderResponseDto>{
    return await this.orderService.updateOrder(payload)
  }

  @Delete(':id')
  async cancelOrder(@Param('id') id: string){
    return await this.orderService.cancelOrder(id);
  }
}
