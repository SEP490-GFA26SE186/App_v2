import { useState } from "react";
import { View } from "react-native";
import { Leaf, PlusCircle, Trash2 } from "lucide-react-native";
import { ActiveChildCard, AddChildCard, CharacterCard, ChildFormSheet, KidPinCard, OtherChildCard, ReadingSettingsCard } from "@/components/parent/children";
import { Button, PageIntro, Screen, ScreenHeader, Sheet, Skeleton } from "@/components/ui";
import { useCreateChild, useDeleteChild, useSelectedChild, useUpdateChild } from "@/hooks/useChildProfile";
import { useParentStore } from "@/stores/sessionStores";
import { toast } from "@/stores/toastStore";

export default function ChildrenScreen() {
  const setSelectedChildId = useParentStore((s) => s.setSelectedChildId);
  const { child: active, children, isLoading, isEmpty } = useSelectedChild();
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null);
  const createChild = useCreateChild();
  const updateChild = useUpdateChild(active?.id);
  const deleteChild = useDeleteChild();
  const others = children.filter((c) => c.id !== active?.id);

  const openModal = (type: "create" | "edit") => {
    createChild.reset();
    updateChild.reset();
    setModal(type);
  };

  const handleSubmit = (payload: Parameters<typeof createChild.mutate>[0]) => {
    if (modal === "create") {
      createChild.mutate(payload, {
        onSuccess: (child) => {
          setSelectedChildId(child.id);
          setModal(null);
          toast.success(`Đã tạo hồ sơ cho ${child.name} 🎉`);
        },
      });
    } else {
      updateChild.mutate(payload, {
        onSuccess: (child) => {
          setModal(null);
          toast.success(`Đã cập nhật hồ sơ ${child.name}`);
        },
      });
    }
  };

  const handleDelete = () =>
    active &&
    deleteChild.mutate(active.id, {
      onSuccess: () => {
        setModal(null);
        if (others[0]) setSelectedChildId(others[0].id);
        toast.info(`Đã xóa hồ sơ ${active.name}`);
      },
      onError: (err) => toast.error(err.message),
    });

  return (
    <Screen header={<ScreenHeader section="Gia đình" title="Bé nhà mình" />}>
      <View style={{ gap: 14 }}>
        <PageIntro icon={Leaf} eyebrow="Hồ sơ của bé" title="Bé nhà mình" text="Quản lý hồ sơ từng bé, nhân vật đại diện trong truyện và mã PIN dùng Chế độ Trẻ Em." />
        <Button label="Thêm hồ sơ bé mới" icon={PlusCircle} onPress={() => openModal("create")} />
      </View>

      {isEmpty ? (
        <AddChildCard onPress={() => openModal("create")} />
      ) : isLoading || !active ? (
        <>
          <Skeleton height={220} />
          <Skeleton height={160} />
        </>
      ) : (
        <>
          <ActiveChildCard child={active} onEdit={() => openModal("edit")} onDelete={() => setModal("delete")} />
          {others.map((c) => (
            <OtherChildCard key={c.id} child={c} onSelect={() => setSelectedChildId(c.id)} />
          ))}
          {others.length === 0 ? <AddChildCard onPress={() => openModal("create")} /> : null}
          {/* key theo bé để form được khởi tạo lại khi chuyển hồ sơ */}
          <ReadingSettingsCard key={active.id} child={active} />
          <CharacterCard child={active} onEdit={() => openModal("edit")} />
          <KidPinCard />
        </>
      )}

      {modal === "create" || modal === "edit" ? (
        <ChildFormSheet
          child={modal === "edit" ? active : null}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          isPending={createChild.isPending || updateChild.isPending}
          serverError={(modal === "create" ? createChild.error : updateChild.error)?.message}
        />
      ) : null}

      <Sheet
        open={modal === "delete" && !!active}
        onClose={() => setModal(null)}
        title={`Xóa hồ sơ ${active?.name ?? ""}?`}
        description="Giá sách, lịch sử đọc và nhân vật của bé sẽ không còn hiển thị. Phiên Chế độ Trẻ Em đang mở của bé cũng bị đăng xuất."
        footer={
          <>
            <Button label="Giữ lại" variant="surface" size="sm" onPress={() => setModal(null)} />
            <Button label="Xóa hồ sơ" icon={Trash2} variant="danger" size="sm" loading={deleteChild.isPending} onPress={handleDelete} />
          </>
        }
      />
    </Screen>
  );
}
