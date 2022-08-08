type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type NameToDestination<TOption> = TOption extends {
  component: infer Component;
  destination?: infer Destination;
}
  ? unknown extends Destination
    ? Component
    : Destination
  : TOption extends string | number | symbol
  ? TOption
  : never;

type MissingDependencies<TDependencies extends Record<string, unknown>, TNames extends unknown[]> = TNames extends [
  infer Name,
  ...infer Rest
]
  ? NameToDestination<Name> extends keyof TDependencies
    ? MissingDependencies<Omit<TDependencies, NameToDestination<Name>>, Rest>
    : MissingDependencies<TDependencies, Rest>
  : TDependencies;

/**
 * Systemic component that can be added to the systemic system.
 * @templace TComponent The type of the component that will be exposed by the systemic system
 * @template TDependencies The type of the dependencies this component depends on
 */
export type Component<TComponent, TDependencies extends Record<string, unknown> = {}> = {
  /**
   * Starts this component
   * @param {TDependencies} dependencies The dependencies of this component
   * @returns A started component
   */
  start: (dependencies: TDependencies) => Promise<TComponent>;
  /**
   * Stops this component
   */
  stop?: () => Promise<void>;
};

type SimpleDependsOnOption<TSystemic> = keyof TSystemic;
type MappingDependsOnOption<TDependencyKeys, TSystemic> = TDependencyKeys extends keyof TSystemic
  ? {
      component: keyof TSystemic;
      destination?: TDependencyKeys;
      optional?: boolean;
      source?: string;
    }
  : {
      component: keyof TSystemic;
      destination: TDependencyKeys;
      optional?: boolean;
      source?: string;
    };
type DependsOnOption<TDependencyKeys, TSystemic> =
  | SimpleDependsOnOption<TSystemic>
  | MappingDependsOnOption<TDependencyKeys, TSystemic>;

type DependsOn<TSystemic extends Record<string, unknown>, TDependencies extends Record<string, unknown>> = {
  /**
   * Specifies which other components the last added components depends on.
   * When name and type of the dependencies match those available in the system, the dependency can be added by name.
   * When a dependency is named differently in the system or only part of a component is required as a dependency, a MappingDependsOnOption can be used.
   */
  dependsOn: <TNames extends DependsOnOption<keyof TDependencies, TSystemic>[]>(
    ...names: TNames
  ) => SystemicBuild<TSystemic, MissingDependencies<TDependencies, TNames>>;
};

type SystemicBuild<TSystemic extends Record<string, unknown>, TDependencies extends Record<string, unknown>> = [
  RequiredKeys<TDependencies>
] extends [never]
  ? Systemic<TSystemic> & DependsOn<TSystemic, TDependencies>
  : DependsOn<TSystemic, TDependencies>;

/**
 * Systemic system.
 */
export type Systemic<T extends Record<string, unknown>> = {
  /**
   * The name of the system
   */
  name: string;

  /**
   * Adds a component to the system
   * @param {string} name the name under which the component will be registered in the system
   * @param {Component} component the component to be added
   * @param options registration options
   */
  add: <S extends string, TComponent, TDependencies extends Record<string, unknown> = {}>(
    name: S extends keyof T ? never : S, // We don't allow duplicate names
    component?: Component<TComponent, TDependencies> | TComponent,
    options?: { scoped?: boolean }
  ) => SystemicBuild<
    {
      [G in keyof T | S]: G extends keyof T ? T[G] : TComponent;
    },
    TDependencies
  >;

  /**
   * Attempting to add the same component twice will result in an error, but sometimes you need to replace existing components with test doubles. Under such circumstances use set instead of add.
   * @param {string} name the name under which the component will be registered in the system
   * @param {Component} component the component to be added
   * @param options registration options
   */
  set: <S extends string, TComponent, TDependencies extends Record<string, unknown> = {}>(
    name: S,
    component: Component<TComponent, TDependencies> | TComponent,
    options?: { scoped?: boolean }
  ) => SystemicBuild<
    {
      [G in keyof T | S]: G extends keyof T ? T[G] : TComponent;
    },
    TDependencies
  >;

  /**
   * Adds a configuration to the system, which will be available as a scoped dependency named 'config'
   */
  configure: <TComponent, TDependencies extends Record<string, unknown> = {}>(
    component: Component<TComponent, TDependencies> | TComponent
  ) => SystemicBuild<T & { config: TComponent }, TDependencies>;

  /**
   * Removes a component from the system.
   * Removing components during tests can decrease startup time.
   */
  remove: <S extends string>(name: S) => Systemic<Omit<T, S>>;

  /**
   * Includes a subsystem into this systemic system
   */
  merge: <TSubSystem extends Record<string, unknown>>(subSystem: Systemic<TSubSystem>) => Systemic<T & TSubSystem>;

  /**
   * Includes a subsystem into this systemic system
   */
  include: <TSubSystem extends Record<string, unknown>>(subSystem: Systemic<TSubSystem>) => Systemic<T & TSubSystem>;

  /**
   * Starts the system and all of its components
   */
  start(callback: (error: Error | null, result?: T) => void): void;
  start(): Promise<T>;

  /**
   * Stops the system and all of its components
   */
  stop(callback: (error: Error | null) => void): void;
  stop(): Promise<void>;

  /**
   * Restarts the system and all of its components
   */
  restart(callback: (error: Error | null, result?: T) => void): void;
  restart(): Promise<T>;

  /**
   * The dependency graph for a medium size project can grow quickly leading to a large system definition.
   * To simplify this you can bootstrap components from a specified directory, where each folder in the directory includes an index.js which defines a sub system. e.g.
   * See documentation for more details.
   */
  bootstrap: <TSystem extends Record<string, unknown> = Record<string, unknown>>(path: string) => Systemic<TSystem>;
};

/**
 * Creates a system to which components for dependency injection can be added
 * @returns An empty systemic system
 */
declare function Systemic<TMaster extends Record<string, unknown> = {}>(options?: { name?: string }): Systemic<TMaster>;

export default Systemic;
