import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaService } from "../common/prisma/prisma.service";
import type { CreateProductDto } from "./dto/create-product.dto";
import { ProductsService } from "./products.service";

const prismaMock = {
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

describe("ProductsService", () => {
  let service: ProductsService;

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it("findAll retourne la liste des produits", async () => {
    const products = [
      { id: "product-1", name: "Clavier", price: 49.99, stock: 5 },
      { id: "product-2", name: "Souris", price: 24.99, stock: 8 },
    ];
    prismaMock.product.findMany.mockResolvedValue(products);

    await expect(service.findAll()).resolves.toBe(products);
    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("findOne retourne le produit trouvé", async () => {
    const product = { id: "product-1", name: "Clavier", price: 49.99, stock: 5 };
    prismaMock.product.findUnique.mockResolvedValue(product);

    await expect(service.findOne(product.id)).resolves.toBe(product);
    expect(prismaMock.product.findUnique).toHaveBeenCalledWith({
      where: { id: product.id },
    });
  });

  it("findOne lève une erreur quand le produit n'existe pas", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne("missing-product")).rejects.toThrow(
      "Produit missing-product introuvable",
    );
  });

  it("create crée et retourne le produit", async () => {
    const dto: CreateProductDto = {
      name: "Clavier",
      description: "Clavier mécanique",
      price: 49.99,
      stock: 5,
    };
    const createdProduct = { id: "product-1", ...dto };
    prismaMock.product.create.mockResolvedValue(createdProduct);

    await expect(service.create(dto)).resolves.toBe(createdProduct);
    expect(prismaMock.product.create).toHaveBeenCalledWith({ data: dto });
  });

  it("updateStock décrémente le stock de la quantité demandée", async () => {
    const product = { id: "product-1", name: "Clavier", price: 49.99, stock: 5 };
    const updatedProduct = { ...product, stock: 3 };
    prismaMock.product.findUnique.mockResolvedValue(product);
    prismaMock.product.update.mockResolvedValue(updatedProduct);

    await expect(service.updateStock(product.id, -2)).resolves.toBe(updatedProduct);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { stock: 3 },
    });
  });

  it("updateStock autorise actuellement un stock inférieur à zéro", async () => {
    const product = { id: "product-1", name: "Clavier", price: 49.99, stock: 1 };
    const updatedProduct = { ...product, stock: -1 };
    prismaMock.product.findUnique.mockResolvedValue(product);
    prismaMock.product.update.mockResolvedValue(updatedProduct);

    await expect(service.updateStock(product.id, -2)).resolves.toBe(updatedProduct);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { stock: -1 },
    });
  });
});
