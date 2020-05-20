import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // TODO:
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not found.');
    }

    const productsList = await this.productsRepository.findAllById(products);

    if (productsList.length !== products.length) {
      throw new AppError('Products does not found.');
    }

    const newQuantity = productsList.map(product => {
      const checkProduct = products.find(
        productCheck => productCheck.id === product.id,
      );

      if (!checkProduct) {
        throw new AppError('Products does not found');
      }
      return {
        id: product.id,
        quantity: product.quantity - checkProduct.quantity,
      };
    });

    const orderedProductList = productsList.map(product => {
      const checkProduct = products.find(
        productCheck => productCheck.id === product.id,
      );

      if (!checkProduct) {
        throw new AppError('Products does not found');
      }

      if (product.quantity < checkProduct.quantity) {
        throw new AppError('Product does not enough');
      }

      return {
        product_id: product.id,
        price: product.price,
        quantity: checkProduct.quantity,
      };
    });

    const orderProducts = await this.ordersRepository.create({
      customer,
      products: orderedProductList,
    });

    await this.productsRepository.updateQuantity(newQuantity);

    return orderProducts;
  }
}

export default CreateProductService;
