import { AdditionalPropsTest } from "./AdditionalPropsTest.js";
import { AdditionalPropsTrueTest } from "./AdditionalPropsTrueTest.js";
import { AdditionalpropsDefault } from "./AdditionalpropsDefault.js";
import { AllOfTest } from "./AllOfTest.js";
import { AllOfWithConstraints } from "./AllOfWithConstraints.js";
import { AllOfWithEmptyObjectAndRequireTest } from "./AllOfWithEmptyObjectAndRequireTest.js";
import { AllOfWithEmptyObjectTest } from "./AllOfWithEmptyObjectTest.js";
import { AllOfWithInlineConstraints } from "./AllOfWithInlineConstraints.js";
import { AllOfWithMixedTest } from "./AllOfWithMixedTest.js";
import { AllOfWithOneElementTest } from "./AllOfWithOneElementTest.js";
import { AllOfWithOneRefElementTest } from "./AllOfWithOneRefElementTest.js";
import { AllOfWithPrimitiveRef } from "./AllOfWithPrimitiveRef.js";
import { AllOfWithRecursiveSchema } from "./AllOfWithRecursiveSchema.js";
import { AllOfWithXExtensibleEnum } from "./AllOfWithXExtensibleEnum.js";
import { AnObjectWithAnItemsField } from "./AnObjectWithAnItemsField.js";
import { AnObjectWithRefImport } from "./AnObjectWithRefImport.js";
import { ApiResponseSchema } from "./ApiResponseSchema.js";
import { BlobSchema } from "./BlobSchema.js";
import { Book } from "./Book.js";
import { BufferSchema } from "./BufferSchema.js";
import { Catalog } from "./Catalog.js";
import { CatalogMeta } from "./CatalogMeta.js";
import { Category } from "./Category.js";
import { ConstantIntegerTest } from "./ConstantIntegerTest.js";
import { CustomStringFormatTest } from "./CustomStringFormatTest.js";
import { DashedBodyTest } from "./DashedBodyTest.js";
import { DefinitionFieldWithDash } from "./DefinitionFieldWithDash.js";
import { DisabledUserTest } from "./DisabledUserTest.js";
import { DisjointUnionsUserTest } from "./DisjointUnionsUserTest.js";
import { Document } from "./Document.js";
import { EmailAddress } from "./EmailAddress.js";
import { EmptyObject } from "./EmptyObject.js";
import { EnabledUserTest } from "./EnabledUserTest.js";
import { EnumFalseTest } from "./EnumFalseTest.js";
import { EnumTest } from "./EnumTest.js";
import { EnumTrueTest } from "./EnumTrueTest.js";
import { FiscalCode } from "./FiscalCode.js";
import { GetCatalog200Response } from "./GetCatalog200Response.js";
import { InlinePropertyTest } from "./InlinePropertyTest.js";
import { IsInboxEnabled } from "./IsInboxEnabled.js";
import { IsWebhookEnabled } from "./IsWebhookEnabled.js";
import { ListOfDefinitions } from "./ListOfDefinitions.js";
import { ListOfReferences } from "./ListOfReferences.js";
import { Message } from "./Message.js";
import { MessageBodyMarkdown } from "./MessageBodyMarkdown.js";
import { MessageContent } from "./MessageContent.js";
import { MessageSubject } from "./MessageSubject.js";
import { NestedObjectTest } from "./NestedObjectTest.js";
import { NewModel } from "./NewModel.js";
import { NonNegativeIntegerTest } from "./NonNegativeIntegerTest.js";
import { NonNegativeNumberTest } from "./NonNegativeNumberTest.js";
import { ObjectDefinitionWithImplicitType } from "./ObjectDefinitionWithImplicitType.js";
import { ObjectDefinitionWithImplicitTypeAndAdditionalProperties } from "./ObjectDefinitionWithImplicitTypeAndAdditionalProperties.js";
import { OneOfTest } from "./OneOfTest.js";
import { OrganizationFiscalCode } from "./OrganizationFiscalCode.js";
import { OrganizationFiscalCodeTest } from "./OrganizationFiscalCodeTest.js";
import { PaginationResponse } from "./PaginationResponse.js";
import { Person } from "./Person.js";
import { PostBreadcrumbCollection201Response } from "./PostBreadcrumbCollection201Response.js";
import { PostBreadcrumbCollectionRequest } from "./PostBreadcrumbCollectionRequest.js";
import { PostUnsupportedContentType201Response } from "./PostUnsupportedContentType201Response.js";
import { PostUnsupportedContentTypeRequest } from "./PostUnsupportedContentTypeRequest.js";
import { PreferredLanguage } from "./PreferredLanguage.js";
import { PreferredLanguages } from "./PreferredLanguages.js";
import { ProblemDetails } from "./ProblemDetails.js";
import { Profile } from "./Profile.js";
import { SimpleDefinition } from "./SimpleDefinition.js";
import { TestAuthBearerHttp503Response } from "./TestAuthBearerHttp503Response.js";
import { TestBinaryFileDownload200Response } from "./TestBinaryFileDownload200Response.js";
import { TestBinaryFileUploadRequest } from "./TestBinaryFileUploadRequest.js";
import { TestDeserUser } from "./TestDeserUser.js";
import { TestFileUploadRequest } from "./TestFileUploadRequest.js";
import { TestInlineBodySchemaRequest } from "./TestInlineBodySchemaRequest.js";
import { TestMultiContentTypesRequest } from "./TestMultiContentTypesRequest.js";
import { TestOctetStreamUploadRequest } from "./TestOctetStreamUploadRequest.js";
import { TestResponseRefWithInlineSchema200Response } from "./TestResponseRefWithInlineSchema200Response.js";
import { WithinRangeExclusiveMaximumIntegerTest } from "./WithinRangeExclusiveMaximumIntegerTest.js";
import { WithinRangeExclusiveMaximumNumberTest } from "./WithinRangeExclusiveMaximumNumberTest.js";
import { WithinRangeExclusiveMinMaxIntegerTest } from "./WithinRangeExclusiveMinMaxIntegerTest.js";
import { WithinRangeExclusiveMinMaxNumberTest } from "./WithinRangeExclusiveMinMaxNumberTest.js";
import { WithinRangeExclusiveMinimumIntegerTest } from "./WithinRangeExclusiveMinimumIntegerTest.js";
import { WithinRangeExclusiveMinimumNumberTest } from "./WithinRangeExclusiveMinimumNumberTest.js";
import { WithinRangeIntegerTest } from "./WithinRangeIntegerTest.js";
import { WithinRangeNumberTest } from "./WithinRangeNumberTest.js";
import { WithinRangeStringTest } from "./WithinRangeStringTest.js";
import { catalog2 } from "./catalog2.js";
import { catalogmeta2 } from "./catalogmeta2.js";
import { documentalias } from "./documentalias.js";
import {
  testAuthBearerQuerySchema,
  testAuthBearerPathSchema,
  testAuthBearerHeadersSchema,
} from "./testAuthBearerParameters.js";
import {
  testAuthBearerHttpQuerySchema,
  testAuthBearerHttpPathSchema,
  testAuthBearerHttpHeadersSchema,
} from "./testAuthBearerHttpParameters.js";
import {
  testSimpleTokenQuerySchema,
  testSimpleTokenPathSchema,
  testSimpleTokenHeadersSchema,
} from "./testSimpleTokenParameters.js";
import {
  testMultipleSuccessQuerySchema,
  testMultipleSuccessPathSchema,
  testMultipleSuccessHeadersSchema,
} from "./testMultipleSuccessParameters.js";
import {
  testFileUploadQuerySchema,
  testFileUploadPathSchema,
  testFileUploadHeadersSchema,
} from "./testFileUploadParameters.js";
import {
  testBinaryFileUploadQuerySchema,
  testBinaryFileUploadPathSchema,
  testBinaryFileUploadHeadersSchema,
} from "./testBinaryFileUploadParameters.js";
import {
  testOctetStreamUploadQuerySchema,
  testOctetStreamUploadPathSchema,
  testOctetStreamUploadHeadersSchema,
} from "./testOctetStreamUploadParameters.js";
import {
  testBinaryFileDownloadQuerySchema,
  testBinaryFileDownloadPathSchema,
  testBinaryFileDownloadHeadersSchema,
} from "./testBinaryFileDownloadParameters.js";
import {
  testResponseHeaderQuerySchema,
  testResponseHeaderPathSchema,
  testResponseHeaderHeadersSchema,
} from "./testResponseHeaderParameters.js";
import {
  testParameterWithReferenceQuerySchema,
  testParameterWithReferencePathSchema,
  testParameterWithReferenceHeadersSchema,
} from "./testParameterWithReferenceParameters.js";
import {
  testInlineBodySchemaQuerySchema,
  testInlineBodySchemaPathSchema,
  testInlineBodySchemaHeadersSchema,
} from "./testInlineBodySchemaParameters.js";
import {
  testParameterWithBodyReferenceQuerySchema,
  testParameterWithBodyReferencePathSchema,
  testParameterWithBodyReferenceHeadersSchema,
} from "./testParameterWithBodyReferenceParameters.js";
import {
  putTestParameterWithBodyReferenceQuerySchema,
  putTestParameterWithBodyReferencePathSchema,
  putTestParameterWithBodyReferenceHeadersSchema,
} from "./putTestParameterWithBodyReferenceParameters.js";
import {
  testParameterWithDashQuerySchema,
  testParameterWithDashPathSchema,
  testParameterWithDashHeadersSchema,
} from "./testParameterWithDashParameters.js";
import {
  testParameterWithDashAnUnderscoreQuerySchema,
  testParameterWithDashAnUnderscorePathSchema,
  testParameterWithDashAnUnderscoreHeadersSchema,
} from "./testParameterWithDashAnUnderscoreParameters.js";
import {
  testWithTwoParamsQuerySchema,
  testWithTwoParamsPathSchema,
  testWithTwoParamsHeadersSchema,
} from "./testWithTwoParamsParameters.js";
import {
  testCoercionQuerySchema,
  testCoercionPathSchema,
  testCoercionHeadersSchema,
} from "./testCoercionParameters.js";
import {
  testParametersAtPathLevelQuerySchema,
  testParametersAtPathLevelPathSchema,
  testParametersAtPathLevelHeadersSchema,
} from "./testParametersAtPathLevelParameters.js";
import {
  testSimplePatchQuerySchema,
  testSimplePatchPathSchema,
  testSimplePatchHeadersSchema,
} from "./testSimplePatchParameters.js";
import {
  testCustomTokenHeaderQuerySchema,
  testCustomTokenHeaderPathSchema,
  testCustomTokenHeaderHeadersSchema,
} from "./testCustomTokenHeaderParameters.js";
import {
  testWithEmptyResponseQuerySchema,
  testWithEmptyResponsePathSchema,
  testWithEmptyResponseHeadersSchema,
} from "./testWithEmptyResponseParameters.js";
import {
  testParamWithSchemaRefQuerySchema,
  testParamWithSchemaRefPathSchema,
  testParamWithSchemaRefHeadersSchema,
} from "./testParamWithSchemaRefParameters.js";
import {
  testHeaderWithSchemaRefQuerySchema,
  testHeaderWithSchemaRefPathSchema,
  testHeaderWithSchemaRefHeadersSchema,
} from "./testHeaderWithSchemaRefParameters.js";
import {
  testHeaderOptionalQuerySchema,
  testHeaderOptionalPathSchema,
  testHeaderOptionalHeadersSchema,
} from "./testHeaderOptionalParameters.js";
import {
  testOverriddenSecurityQuerySchema,
  testOverriddenSecurityPathSchema,
  testOverriddenSecurityHeadersSchema,
} from "./testOverriddenSecurityParameters.js";
import {
  testOverriddenSecurityNoAuthQuerySchema,
  testOverriddenSecurityNoAuthPathSchema,
  testOverriddenSecurityNoAuthHeadersSchema,
} from "./testOverriddenSecurityNoAuthParameters.js";
import {
  testMultiContentTypesQuerySchema,
  testMultiContentTypesPathSchema,
  testMultiContentTypesHeadersSchema,
} from "./testMultiContentTypesParameters.js";
import {
  testDeserializationQuerySchema,
  testDeserializationPathSchema,
  testDeserializationHeadersSchema,
} from "./testDeserializationParameters.js";
import {
  testDashedBodyQuerySchema,
  testDashedBodyPathSchema,
  testDashedBodyHeadersSchema,
} from "./testDashedBodyParameters.js";
import {
  testNoBodyQuerySchema,
  testNoBodyPathSchema,
  testNoBodyHeadersSchema,
} from "./testNoBodyParameters.js";
import {
  createDocumentQuerySchema,
  createDocumentPathSchema,
  createDocumentHeadersSchema,
} from "./createDocumentParameters.js";
import {
  testRequestBodiesQuerySchema,
  testRequestBodiesPathSchema,
  testRequestBodiesHeadersSchema,
} from "./testRequestBodiesParameters.js";
import {
  createUserWithRequestBodiesQuerySchema,
  createUserWithRequestBodiesPathSchema,
  createUserWithRequestBodiesHeadersSchema,
} from "./createUserWithRequestBodiesParameters.js";
import {
  testResponseRefWithInlineSchemaQuerySchema,
  testResponseRefWithInlineSchemaPathSchema,
  testResponseRefWithInlineSchemaHeadersSchema,
} from "./testResponseRefWithInlineSchemaParameters.js";
import {
  getCatalogQuerySchema,
  getCatalogPathSchema,
  getCatalogHeadersSchema,
} from "./getCatalogParameters.js";
import {
  postBreadcrumbCollectionQuerySchema,
  postBreadcrumbCollectionPathSchema,
  postBreadcrumbCollectionHeadersSchema,
} from "./postBreadcrumbCollectionParameters.js";
import {
  postUnsupportedContentTypeQuerySchema,
  postUnsupportedContentTypePathSchema,
  postUnsupportedContentTypeHeadersSchema,
} from "./postUnsupportedContentTypeParameters.js";
import {
  testQueryParamInlineEnumQuerySchema,
  testQueryParamInlineEnumPathSchema,
  testQueryParamInlineEnumHeadersSchema,
} from "./testQueryParamInlineEnumParameters.js";

export {
  AdditionalPropsTest,
  AdditionalPropsTrueTest,
  AdditionalpropsDefault,
  AllOfTest,
  AllOfWithConstraints,
  AllOfWithEmptyObjectAndRequireTest,
  AllOfWithEmptyObjectTest,
  AllOfWithInlineConstraints,
  AllOfWithMixedTest,
  AllOfWithOneElementTest,
  AllOfWithOneRefElementTest,
  AllOfWithPrimitiveRef,
  AllOfWithRecursiveSchema,
  AllOfWithXExtensibleEnum,
  AnObjectWithAnItemsField,
  AnObjectWithRefImport,
  ApiResponseSchema,
  BlobSchema,
  Book,
  BufferSchema,
  Catalog,
  CatalogMeta,
  Category,
  ConstantIntegerTest,
  CustomStringFormatTest,
  DashedBodyTest,
  DefinitionFieldWithDash,
  DisabledUserTest,
  DisjointUnionsUserTest,
  Document,
  EmailAddress,
  EmptyObject,
  EnabledUserTest,
  EnumFalseTest,
  EnumTest,
  EnumTrueTest,
  FiscalCode,
  GetCatalog200Response,
  InlinePropertyTest,
  IsInboxEnabled,
  IsWebhookEnabled,
  ListOfDefinitions,
  ListOfReferences,
  Message,
  MessageBodyMarkdown,
  MessageContent,
  MessageSubject,
  NestedObjectTest,
  NewModel,
  NonNegativeIntegerTest,
  NonNegativeNumberTest,
  ObjectDefinitionWithImplicitType,
  ObjectDefinitionWithImplicitTypeAndAdditionalProperties,
  OneOfTest,
  OrganizationFiscalCode,
  OrganizationFiscalCodeTest,
  PaginationResponse,
  Person,
  PostBreadcrumbCollection201Response,
  PostBreadcrumbCollectionRequest,
  PostUnsupportedContentType201Response,
  PostUnsupportedContentTypeRequest,
  PreferredLanguage,
  PreferredLanguages,
  ProblemDetails,
  Profile,
  SimpleDefinition,
  TestAuthBearerHttp503Response,
  TestBinaryFileDownload200Response,
  TestBinaryFileUploadRequest,
  TestDeserUser,
  TestFileUploadRequest,
  TestInlineBodySchemaRequest,
  TestMultiContentTypesRequest,
  TestOctetStreamUploadRequest,
  TestResponseRefWithInlineSchema200Response,
  WithinRangeExclusiveMaximumIntegerTest,
  WithinRangeExclusiveMaximumNumberTest,
  WithinRangeExclusiveMinMaxIntegerTest,
  WithinRangeExclusiveMinMaxNumberTest,
  WithinRangeExclusiveMinimumIntegerTest,
  WithinRangeExclusiveMinimumNumberTest,
  WithinRangeIntegerTest,
  WithinRangeNumberTest,
  WithinRangeStringTest,
  catalog2,
  catalogmeta2,
  createDocumentHeadersSchema,
  createDocumentPathSchema,
  createDocumentQuerySchema,
  createUserWithRequestBodiesHeadersSchema,
  createUserWithRequestBodiesPathSchema,
  createUserWithRequestBodiesQuerySchema,
  documentalias,
  getCatalogHeadersSchema,
  getCatalogPathSchema,
  getCatalogQuerySchema,
  postBreadcrumbCollectionHeadersSchema,
  postBreadcrumbCollectionPathSchema,
  postBreadcrumbCollectionQuerySchema,
  postUnsupportedContentTypeHeadersSchema,
  postUnsupportedContentTypePathSchema,
  postUnsupportedContentTypeQuerySchema,
  putTestParameterWithBodyReferenceHeadersSchema,
  putTestParameterWithBodyReferencePathSchema,
  putTestParameterWithBodyReferenceQuerySchema,
  testAuthBearerHeadersSchema,
  testAuthBearerHttpHeadersSchema,
  testAuthBearerHttpPathSchema,
  testAuthBearerHttpQuerySchema,
  testAuthBearerPathSchema,
  testAuthBearerQuerySchema,
  testBinaryFileDownloadHeadersSchema,
  testBinaryFileDownloadPathSchema,
  testBinaryFileDownloadQuerySchema,
  testBinaryFileUploadHeadersSchema,
  testBinaryFileUploadPathSchema,
  testBinaryFileUploadQuerySchema,
  testCoercionHeadersSchema,
  testCoercionPathSchema,
  testCoercionQuerySchema,
  testCustomTokenHeaderHeadersSchema,
  testCustomTokenHeaderPathSchema,
  testCustomTokenHeaderQuerySchema,
  testDashedBodyHeadersSchema,
  testDashedBodyPathSchema,
  testDashedBodyQuerySchema,
  testDeserializationHeadersSchema,
  testDeserializationPathSchema,
  testDeserializationQuerySchema,
  testFileUploadHeadersSchema,
  testFileUploadPathSchema,
  testFileUploadQuerySchema,
  testHeaderOptionalHeadersSchema,
  testHeaderOptionalPathSchema,
  testHeaderOptionalQuerySchema,
  testHeaderWithSchemaRefHeadersSchema,
  testHeaderWithSchemaRefPathSchema,
  testHeaderWithSchemaRefQuerySchema,
  testInlineBodySchemaHeadersSchema,
  testInlineBodySchemaPathSchema,
  testInlineBodySchemaQuerySchema,
  testMultiContentTypesHeadersSchema,
  testMultiContentTypesPathSchema,
  testMultiContentTypesQuerySchema,
  testMultipleSuccessHeadersSchema,
  testMultipleSuccessPathSchema,
  testMultipleSuccessQuerySchema,
  testNoBodyHeadersSchema,
  testNoBodyPathSchema,
  testNoBodyQuerySchema,
  testOctetStreamUploadHeadersSchema,
  testOctetStreamUploadPathSchema,
  testOctetStreamUploadQuerySchema,
  testOverriddenSecurityHeadersSchema,
  testOverriddenSecurityNoAuthHeadersSchema,
  testOverriddenSecurityNoAuthPathSchema,
  testOverriddenSecurityNoAuthQuerySchema,
  testOverriddenSecurityPathSchema,
  testOverriddenSecurityQuerySchema,
  testParamWithSchemaRefHeadersSchema,
  testParamWithSchemaRefPathSchema,
  testParamWithSchemaRefQuerySchema,
  testParameterWithBodyReferenceHeadersSchema,
  testParameterWithBodyReferencePathSchema,
  testParameterWithBodyReferenceQuerySchema,
  testParameterWithDashAnUnderscoreHeadersSchema,
  testParameterWithDashAnUnderscorePathSchema,
  testParameterWithDashAnUnderscoreQuerySchema,
  testParameterWithDashHeadersSchema,
  testParameterWithDashPathSchema,
  testParameterWithDashQuerySchema,
  testParameterWithReferenceHeadersSchema,
  testParameterWithReferencePathSchema,
  testParameterWithReferenceQuerySchema,
  testParametersAtPathLevelHeadersSchema,
  testParametersAtPathLevelPathSchema,
  testParametersAtPathLevelQuerySchema,
  testQueryParamInlineEnumHeadersSchema,
  testQueryParamInlineEnumPathSchema,
  testQueryParamInlineEnumQuerySchema,
  testRequestBodiesHeadersSchema,
  testRequestBodiesPathSchema,
  testRequestBodiesQuerySchema,
  testResponseHeaderHeadersSchema,
  testResponseHeaderPathSchema,
  testResponseHeaderQuerySchema,
  testResponseRefWithInlineSchemaHeadersSchema,
  testResponseRefWithInlineSchemaPathSchema,
  testResponseRefWithInlineSchemaQuerySchema,
  testSimplePatchHeadersSchema,
  testSimplePatchPathSchema,
  testSimplePatchQuerySchema,
  testSimpleTokenHeadersSchema,
  testSimpleTokenPathSchema,
  testSimpleTokenQuerySchema,
  testWithEmptyResponseHeadersSchema,
  testWithEmptyResponsePathSchema,
  testWithEmptyResponseQuerySchema,
  testWithTwoParamsHeadersSchema,
  testWithTwoParamsPathSchema,
  testWithTwoParamsQuerySchema,
};
