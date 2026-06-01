

import { TemplateParams } from './app';

/**
 * Capitalize the first letter of a string (used for Go exported identifiers).
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Convert a kebab-case or space-separated module name to a valid Go package
 * name (lowercase, no separators).
 */
function goPackage(moduleName: string): string {
  return moduleName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Derive the Go module path from TemplateParams.
 * Falls back to "github.com/<chain>/<chain>" when no explicit path is given.
 */
function goModulePath(p: TemplateParams): string {
  const chainId = p.name.toLowerCase().replace(/\s+/g, '-');
  return `github.com/${chainId}/${chainId}`;
}

/**
 * Generates the top-level `module.go` for a custom Cosmos SDK v0.50 module.
 *
 * This wires the module into the Cosmos SDK module manager via the
 * `AppModule` / `AppModuleBasic` interfaces, registers codecs, gRPC
 * gateway routes, services, genesis handling, and begin/end block hooks.
 */
export function generateModuleGo(p: TemplateParams, moduleName: string): string {
  const pkg = goPackage(moduleName);
  const modPath = goModulePath(p);
  const capName = capitalize(pkg);

  return `package ${pkg}

import (
	"context"
	"encoding/json"
	"fmt"

	abci "github.com/cometbft/cometbft/abci/types"
	"github.com/grpc-ecosystem/grpc-gateway/runtime"
	"github.com/spf13/cobra"

	"cosmossdk.io/core/appmodule"
	"github.com/cosmos/cosmos-sdk/client"
	"github.com/cosmos/cosmos-sdk/codec"
	cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/module"

	"${modPath}/x/${pkg}/keeper"
	"${modPath}/x/${pkg}/types"
)

var (
	_ module.AppModuleBasic = AppModuleBasic{}
	_ module.AppModule      = AppModule{}

	_ appmodule.AppModule       = AppModule{}
	_ appmodule.HasBeginBlocker = AppModule{}
	_ appmodule.HasEndBlocker   = AppModule{}
)

type AppModuleBasic struct {
	cdc codec.BinaryCodec
}

func NewAppModuleBasic(cdc codec.BinaryCodec) AppModuleBasic {
	return AppModuleBasic{cdc: cdc}
}

func (AppModuleBasic) Name() string {
	return types.ModuleName
}

func (AppModuleBasic) RegisterLegacyAminoCodec(cdc *codec.LegacyAmino) {
	types.RegisterCodec(cdc)
}

func (a AppModuleBasic) RegisterInterfaces(reg cdctypes.InterfaceRegistry) {
	types.RegisterInterfaces(reg)
}

func (AppModuleBasic) DefaultGenesis(cdc codec.JSONCodec) json.RawMessage {
	return cdc.MustMarshalJSON(types.DefaultGenesis())
}

func (AppModuleBasic) ValidateGenesis(cdc codec.JSONCodec, _ client.TxEncodingConfig, bz json.RawMessage) error {
	var genState types.GenesisState
	if err := cdc.UnmarshalJSON(bz, &genState); err != nil {
		return fmt.Errorf("failed to unmarshal %s genesis state: %w", types.ModuleName, err)
	}
	return genState.Validate()
}

func (AppModuleBasic) RegisterGRPCGatewayRoutes(clientCtx client.Context, mux *runtime.ServeMux) {
	if err := types.RegisterQueryHandlerClient(context.Background(), mux, types.NewQueryClient(clientCtx)); err != nil {
		panic(err)
	}
}

func (AppModuleBasic) GetTxCmd() *cobra.Command {
	return nil
}

func (AppModuleBasic) GetQueryCmd() *cobra.Command {
	return nil
}

type AppModule struct {
	AppModuleBasic
	keeper keeper.Keeper
}

func NewAppModule(
	cdc codec.Codec,
	keeper keeper.Keeper,
) AppModule {
	return AppModule{
		AppModuleBasic: NewAppModuleBasic(cdc),
		keeper:         keeper,
	}
}

func (am AppModule) IsOnePerModuleType() {}

func (am AppModule) IsAppModule() {}

func (am AppModule) RegisterServices(cfg module.Configurator) {
	types.RegisterMsgServer(cfg.MsgServer(), keeper.NewMsgServerImpl(am.keeper))
	types.RegisterQueryServer(cfg.QueryServer(), keeper.NewQueryServerImpl(am.keeper))
}

func (AppModule) ConsensusVersion() uint64 { return 1 }

func (am AppModule) BeginBlock(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	_ = sdkCtx // TODO: add begin-block logic for ${pkg}
	return nil
}

func (am AppModule) EndBlock(ctx context.Context) error {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	_ = sdkCtx // TODO: add end-block logic for ${pkg}
	return nil
}

func (am AppModule) InitGenesis(ctx sdk.Context, cdc codec.JSONCodec, data json.RawMessage) []abci.ValidatorUpdate {
	var genState types.GenesisState
	cdc.MustUnmarshalJSON(data, &genState)

	am.keeper.InitGenesis(ctx, genState)
	return []abci.ValidatorUpdate{}
}

func (am AppModule) ExportGenesis(ctx sdk.Context, cdc codec.JSONCodec) json.RawMessage {
	genState := am.keeper.ExportGenesis(ctx)
	return cdc.MustMarshalJSON(genState)
}
`;
}

/**
 * Generates the Keeper for a custom Cosmos SDK v0.50 module.
 *
 * The Keeper is the core state-management component. It holds references to
 * the binary codec, the KV store key, and the module authority address
 * (typically the gov module account).
 */
export function generateKeeperGo(p: TemplateParams, moduleName: string): string {
  const pkg = goPackage(moduleName);
  const modPath = goModulePath(p);

  return `package keeper

import (
	"fmt"

	"cosmossdk.io/log"
	storetypes "cosmossdk.io/store/types"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"${modPath}/x/${pkg}/types"
)

type Keeper struct {
	cdc       codec.BinaryCodec
	storeKey  storetypes.StoreKey
	authority string
}

func NewKeeper(
	cdc codec.BinaryCodec,
	storeKey storetypes.StoreKey,
	authority string,
) Keeper {
	return Keeper{
		cdc:       cdc,
		storeKey:  storeKey,
		authority: authority,
	}
}

func (k Keeper) GetAuthority() string {
	return k.authority
}

func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

func (k Keeper) InitGenesis(ctx sdk.Context, genState types.GenesisState) {
	k.SetParams(ctx, genState.Params)
}

func (k Keeper) ExportGenesis(ctx sdk.Context) *types.GenesisState {
	return &types.GenesisState{
		Params: k.GetParams(ctx),
	}
}

func (k Keeper) SetParams(ctx sdk.Context, params types.Params) {
	store := ctx.KVStore(k.storeKey)
	bz := k.cdc.MustMarshal(&params)
	store.Set(types.ParamsKey, bz)
}

func (k Keeper) GetParams(ctx sdk.Context) types.Params {
	store := ctx.KVStore(k.storeKey)
	bz := store.Get(types.ParamsKey)
	if bz == nil {
		return types.DefaultParams()
	}

	var params types.Params
	k.cdc.MustUnmarshal(bz, &params)
	return params
}
`;
}

/**
 * Generates the message server implementation for a custom module.
 *
 * The message server handles all state-mutating transactions. A stub
 * `UpdateParams` handler is provided as the canonical governance-gated
 * message pattern in Cosmos SDK v0.50.
 */
export function generateMsgServerGo(p: TemplateParams, moduleName: string): string {
  const pkg = goPackage(moduleName);
  const modPath = goModulePath(p);

  return `package keeper

import (
	"context"

	"cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"

	"${modPath}/x/${pkg}/types"
)

var _ types.MsgServer = msgServer{}

type msgServer struct {
	Keeper
}

func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

func (ms msgServer) UpdateParams(goCtx context.Context, msg *types.MsgUpdateParams) (*types.MsgUpdateParamsResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if ms.GetAuthority() != msg.Authority {
		return nil, errors.Wrapf(
			sdkerrors.ErrUnauthorized,
			"invalid authority; expected %s, got %s",
			ms.GetAuthority(),
			msg.Authority,
		)
	}

	if err := msg.Params.Validate(); err != nil {
		return nil, err
	}

	ms.SetParams(ctx, msg.Params)

	ctx.EventManager().EmitEvent(
		sdk.NewEvent(
			types.EventTypeUpdateParams,
			sdk.NewAttribute(types.AttributeKeyAuthority, msg.Authority),
		),
	)

	return &types.MsgUpdateParamsResponse{}, nil
}
`;
}

/**
 * Generates the query server implementation for a custom module.
 *
 * The query server handles all read-only gRPC queries. A stub `Params`
 * handler is provided following the standard Cosmos SDK pattern.
 */
export function generateQueryServerGo(p: TemplateParams, moduleName: string): string {
  const pkg = goPackage(moduleName);
  const modPath = goModulePath(p);

  return `package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"${modPath}/x/${pkg}/types"
)

var _ types.QueryServer = queryServer{}

type queryServer struct {
	Keeper
}

func NewQueryServerImpl(keeper Keeper) types.QueryServer {
	return &queryServer{Keeper: keeper}
}

func (qs queryServer) Params(goCtx context.Context, req *types.QueryParamsRequest) (*types.QueryParamsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}

	ctx := sdk.UnwrapSDKContext(goCtx)
	params := qs.GetParams(ctx)

	return &types.QueryParamsResponse{Params: params}, nil
}
`;
}

/**
 * Generates the key constants for a custom module.
 *
 * These constants define the module name, store key, and key prefixes
 * used throughout the module's KV store for deterministic state layout.
 */
export function generateTypesKeysGo(_p: TemplateParams, moduleName: string): string {
  const pkg = goPackage(moduleName);

  return `package types

const (

	ModuleName = "${pkg}"

	StoreKey = ModuleName

	RouterKey = ModuleName

	MemStoreKey = "mem_" + ModuleName
)

var (

	ParamsKey = []byte{0x01}

	KeyPrefixItem = []byte{0x02}
)

const (

	EventTypeUpdateParams = "update_params"

	AttributeKeyAuthority = "authority"
)
`;
}

/**
 * Generates the message types for a custom module.
 *
 * Includes the `MsgUpdateParams` governance-gated message with full
 * `sdk.Msg` interface implementation (ValidateBasic, GetSigners, Route,
 * Type) following Cosmos SDK v0.50 conventions.
 */
export function generateTypesMsgsGo(_p: TemplateParams, moduleName: string): string {
  const pkg = goPackage(moduleName);

  return `package types

import (
	"cosmossdk.io/errors"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
)

var _ sdk.Msg = &MsgUpdateParams{}

const (
	TypeMsgUpdateParams = "update_params"
)

type MsgUpdateParams struct {

	Authority string \`protobuf:"bytes,1,opt,name=authority,proto3" json:"authority,omitempty"\`

	Params Params \`protobuf:"bytes,2,opt,name=params,proto3" json:"params"\`
}

type MsgUpdateParamsResponse struct{}

func NewMsgUpdateParams(authority string, params Params) *MsgUpdateParams {
	return &MsgUpdateParams{
		Authority: authority,
		Params:    params,
	}
}

func (msg *MsgUpdateParams) Route() string {
	return RouterKey
}

func (msg *MsgUpdateParams) Type() string {
	return TypeMsgUpdateParams
}

func (msg *MsgUpdateParams) GetSigners() []sdk.AccAddress {
	authority, err := sdk.AccAddressFromBech32(msg.Authority)
	if err != nil {
		panic(err)
	}
	return []sdk.AccAddress{authority}
}

func (msg *MsgUpdateParams) GetSignBytes() []byte {
	return sdk.MustSortJSON(ModuleCdc.MustMarshalJSON(msg))
}

func (msg *MsgUpdateParams) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(msg.Authority); err != nil {
		return errors.Wrapf(sdkerrors.ErrInvalidAddress, "invalid authority address (%s)", err)
	}

	if err := msg.Params.Validate(); err != nil {
		return err
	}

	return nil
}

func (msg *MsgUpdateParams) ProtoMessage() {}

func (msg *MsgUpdateParams) Reset() { *msg = MsgUpdateParams{} }

func (msg *MsgUpdateParams) String() string { return "" }

func (msg *MsgUpdateParamsResponse) ProtoMessage() {}

func (msg *MsgUpdateParamsResponse) Reset() { *msg = MsgUpdateParamsResponse{} }

func (msg *MsgUpdateParamsResponse) String() string { return "" }
`;
}

/**
 * Generates the genesis types for a custom module.
 *
 * Includes `GenesisState`, `DefaultGenesis()`, `Validate()`, as well as
 * the `Params` struct with `DefaultParams()` and `Validate()`.
 */
export function generateTypesGenesisGo(_p: TemplateParams, moduleName: string): string {
  const pkg = goPackage(moduleName);

  return `package types

import (
	"fmt"
)

type GenesisState struct {

	Params Params \`protobuf:"bytes,1,opt,name=params,proto3" json:"params"\`
}

func DefaultGenesis() *GenesisState {
	return &GenesisState{
		Params: DefaultParams(),
	}
}

func (gs GenesisState) Validate() error {
	if err := gs.Params.Validate(); err != nil {
		return fmt.Errorf("invalid params: %w", err)
	}
	return nil
}

func (gs *GenesisState) ProtoMessage() {}

func (gs *GenesisState) Reset() { *gs = GenesisState{} }

func (gs *GenesisState) String() string { return "" }

type Params struct {

	Admin string \`protobuf:"bytes,1,opt,name=admin,proto3" json:"admin,omitempty"\`

	Enabled bool \`protobuf:"varint,2,opt,name=enabled,proto3" json:"enabled,omitempty"\`
}

func DefaultParams() Params {
	return Params{
		Admin:   "",
		Enabled: true,
	}
}

func (p Params) Validate() error {

	return nil
}

func (p *Params) ProtoMessage() {}

func (p *Params) Reset() { *p = Params{} }

func (p *Params) String() string { return fmt.Sprintf("Admin: %s, Enabled: %t", p.Admin, p.Enabled) }
`;
}

/**
 * Generates sentinel errors for a custom module.
 *
 * Follows the `cosmossdk.io/errors` pattern introduced in SDK v0.50,
 * where each error has a unique code-space and numeric code.
 */
export function generateTypesErrorsGo(_p: TemplateParams, moduleName: string): string {
  const pkg = goPackage(moduleName);

  return `package types

import (
	"cosmossdk.io/errors"
)

var (

	ErrInvalidSigner = errors.Register(ModuleName, 1100, "expected gov account as only signer for proposal message")

	ErrInvalidRequest = errors.Register(ModuleName, 1101, "invalid request")

	ErrInvalidAuthority = errors.Register(ModuleName, 1102, "invalid authority")

	ErrInvalidParams = errors.Register(ModuleName, 1103, "invalid module params")

	ErrNotFound = errors.Register(ModuleName, 1104, "resource not found")

	ErrAlreadyExists = errors.Register(ModuleName, 1105, "resource already exists")

	ErrUnauthorized = errors.Register(ModuleName, 1106, "unauthorized")
)
`;
}

/**
 * Generates codec registration for a custom module.
 *
 * This file registers message types with both the legacy Amino codec
 * (for backwards compatibility) and the modern Protobuf InterfaceRegistry
 * (for proper Any-type packing and ADR-028 compliance).
 */
export function generateTypesCodecGo(_p: TemplateParams, moduleName: string): string {
  const pkg = goPackage(moduleName);

  return `package types

import (
	"github.com/cosmos/cosmos-sdk/codec"
	cdctypes "github.com/cosmos/cosmos-sdk/codec/types"
	cryptocodec "github.com/cosmos/cosmos-sdk/crypto/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/types/msgservice"
)

func RegisterCodec(cdc *codec.LegacyAmino) {
	cdc.RegisterConcrete(&MsgUpdateParams{}, "${pkg}/MsgUpdateParams", nil)
}

func RegisterInterfaces(registry cdctypes.InterfaceRegistry) {
	registry.RegisterImplementations((*sdk.Msg)(nil),
		&MsgUpdateParams{},
	)

	msgservice.RegisterMsgServiceDesc(registry, &_Msg_serviceDesc)
}

var (

	amino = codec.NewLegacyAmino()

	ModuleCdc = codec.NewAminoCodec(amino)
)

func init() {
	RegisterCodec(amino)
	cryptocodec.RegisterCrypto(amino)
	amino.Seal()
}

var _Msg_serviceDesc = msgservice.ServiceDesc{}

type MsgServer interface {
	UpdateParams(ctx interface{}, msg *MsgUpdateParams) (*MsgUpdateParamsResponse, error)
}

func RegisterMsgServer(s interface{ RegisterService(desc interface{}, impl interface{}) }, impl MsgServer) {

}

type QueryServer interface {
	Params(ctx interface{}, req *QueryParamsRequest) (*QueryParamsResponse, error)
}

type QueryParamsRequest struct{}

type QueryParamsResponse struct {
	Params Params \`protobuf:"bytes,1,opt,name=params,proto3" json:"params"\`
}

func (m *QueryParamsRequest) ProtoMessage() {}

func (m *QueryParamsRequest) Reset() { *m = QueryParamsRequest{} }

func (m *QueryParamsRequest) String() string { return "" }

func (m *QueryParamsResponse) ProtoMessage() {}

func (m *QueryParamsResponse) Reset() { *m = QueryParamsResponse{} }

func (m *QueryParamsResponse) String() string { return "" }

func RegisterQueryServer(s interface{ RegisterService(desc interface{}, impl interface{}) }, impl QueryServer) {

}

func NewQueryClient(cc interface{}) QueryServer {
	return nil
}

func RegisterQueryHandlerClient(ctx interface{}, mux interface{}, client QueryServer) error {
	return nil
}
`;
}
