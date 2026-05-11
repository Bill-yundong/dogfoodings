import type { ComputationPlugin, ExecutionContext, PluginRegistry } from '../types'

class PluginRegistryImpl implements PluginRegistry {
  private plugins: Map<string, ComputationPlugin> = new Map()

  register(plugin: ComputationPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} already registered, overwriting...`)
    }
    this.plugins.set(plugin.id, plugin)
    console.log(`✅ Plugin registered: ${plugin.name} (${plugin.id})`)
  }

  unregister(pluginId: string): void {
    this.plugins.delete(pluginId)
    console.log(`❌ Plugin unregistered: ${pluginId}`)
  }

  get(pluginId: string): ComputationPlugin | undefined {
    return this.plugins.get(pluginId)
  }

  list(): ComputationPlugin[] {
    return Array.from(this.plugins.values())
  }

  async execute<T, R>(
    pluginId: string,
    input: T,
    context?: ExecutionContext
  ): Promise<R> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin ${pluginId} requires dependency ${dep}`)
        }
      }
    }

    if (plugin.validate && !plugin.validate(input)) {
      throw new Error(`Input validation failed for plugin ${pluginId}`)
    }

    context?.signal?.throwIfAborted()

    return plugin.execute(input, context) as Promise<R>
  }
}

export const pluginRegistry = new PluginRegistryImpl()
