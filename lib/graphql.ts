import { gql } from "@apollo/client";

export const GET_PUBLIC_STOREFRONT = gql`
  query PublicStorefront($storeId: String, $slug: String) {
    publicStorefront(storeId: $storeId, slug: $slug) {
      id
      slug
      name
      description
      logoUrl
      bannerUrl
      phone
      street
      number
      complement
      neighborhood
      city
      state
      zipCode
      isOpen
      isActive
      storeType
      hasOwnDelivery
      freeDelivery
      deliveryFee
      estimatedDeliveryMinutes
      minimumOrder
      deliveryStartTime
      deliveryEndTime
      freeDeliveryAbove
      verificationLevel
      averageRating
      totalRatings
      categories {
        id
        name
        imageUrl
        sortOrder
        requiresAgeVerification
        products {
          id
          name
          description
          price
          promotionalPrice
          imageUrl
          isAvailable
          stock
          unit
          isVariableWeight
        }
      }
    }
  }
`;

export const GET_PUBLIC_STORES = gql`
  query PublicStores {
    publicStores {
      id
      slug
      name
      description
      logoUrl
      bannerUrl
      city
      state
      isOpen
      storeType
      deliveryFee
      freeDelivery
      estimatedDeliveryMinutes
      minimumOrder
      verificationLevel
      averageRating
      totalRatings
    }
  }
`;

export const LOGIN_APP = gql`
  mutation LoginApp($input: LoginInput!, $forceLogin: Boolean) {
    loginApp(input: $input, forceLogin: $forceLogin) {
      accessToken
      user {
        id
        name
        email
        phone
      }
    }
  }
`;

export const REGISTER_APP = gql`
  mutation RegisterApp($input: RegisterAppInput!) {
    registerApp(input: $input) {
      accessToken
      user {
        id
        name
        email
        phone
      }
    }
  }
`;

export const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      orderNumber
      status
      total
      subtotal
      deliveryFee
      createdAt
    }
  }
`;

export const CALCULATE_DELIVERY_FEE = gql`
  query CalculateDeliveryFee(
    $storeId: String!
    $customerLatitude: Float!
    $customerLongitude: Float!
  ) {
    calculateDeliveryFee(
      storeId: $storeId
      customerLatitude: $customerLatitude
      customerLongitude: $customerLongitude
    )
  }
`;

// O backend exige max(minimoDaPlataforma, minimoDaLoja) quando a loja NAO tem
// frota propria. O site so validava o minimo da LOJA, entao um carrinho abaixo
// do minimo da plataforma passava por toda a tela de endereco e so era recusado
// no "Confirmar pedido", com a mensagem crua do servidor.
export const GET_MINIMUM_ORDER_PLATFORM = gql`
  query MinimumOrderPlatform {
    minimumOrderPlatform
  }
`;
