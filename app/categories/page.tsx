import { CategoriesTable } from "@/components/categories-table";

/** Categories route: market sectors ranked by market cap. */
const CategoriesPage = (): React.ReactNode => (
  <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-semibold">Categories</h1>
      <p className="text-sm text-muted-foreground">
        Market sectors ranked by market capitalization.
      </p>
    </div>
    <CategoriesTable />
  </div>
);

export default CategoriesPage;
