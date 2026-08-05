/**
 * Example Hello Menu extension — manifests only for install-from-upload demos.
 * Runtime registration uses Official Host APIs; this package documents the shape.
 */
module.exports = {
  id: 'example.hello-menu',
  type: 'widget',
  activate(ctx) {
    ctx.log('info', 'hello-menu activated', { greeting: ctx.settings.greeting || 'Hello' });
  },
};
