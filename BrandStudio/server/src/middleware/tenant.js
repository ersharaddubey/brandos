import { AsyncLocalStorage } from 'node:async_hooks';
const tenantContext = new AsyncLocalStorage();
export const runWithTenant = (organizationId, callback) => tenantContext.run(organizationId ? String(organizationId) : null, callback);
export const currentTenantId = () => tenantContext.getStore() || null;
export function tenantPlugin(schema) {
  schema.add({ organizationId: { type: schema.base.Schema.Types.ObjectId, ref: 'Organization', index: true, default: undefined } });
  const scoped = function(next) { const org=tenantContext.getStore(); if(org && !this.getOptions?.().skipTenantScope) { this.setQuery({ ...(this.getQuery()||{}), organizationId: org }); if(this.getOptions?.().upsert) { const update=this.getUpdate(); if(update && !Array.isArray(update)) { update.$setOnInsert={ ...(update.$setOnInsert||{}), organizationId: org }; this.setUpdate(update); } } } next(); };
  for (const op of ['find','findOne','countDocuments','updateOne','updateMany','deleteOne','deleteMany','findOneAndUpdate','findOneAndDelete']) schema.pre(op, scoped);
  schema.pre('save', function(next) { const org=tenantContext.getStore(); if(org && !this.organizationId) this.organizationId=org; next(); });
  schema.pre('aggregate', function(next) { const org=tenantContext.getStore(); if(org) this.pipeline().unshift({$match:{organizationId:new schema.base.Types.ObjectId(org)}}); next(); });
}
